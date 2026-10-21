import type {
  AggregateNode,
  ArithmeticNode,
  CalculationNode,
  CalculationGraph,
  CalculationSnapshot,
  Condition,
  FilterNode,
  OutputColumnNode,
  ResultItem,
  ResultSet
} from "./types";
import { validateGraph } from "./graphService";

export type RowRecord = Record<string, unknown>;

export interface ExecutionWarning {
  message: string;
  nodeId?: string;
}

type Cache = Map<string, unknown>;

/**
 * 条件评估器：最小必需操作符集合（= != > >= < <= in not_in contains between）。
 * 不引入更复杂查询语言。
 */
function evaluateCondition(row: RowRecord, condition: Condition): boolean {
  const raw = row[condition.field];
  const value = condition.value;

  switch (condition.operator) {
    case "=":
      return raw === value;
    case "!=":
      return raw !== value;
    case ">":
      return typeof raw === "number" && typeof value === "number" && raw > value;
    case ">=":
      return typeof raw === "number" && typeof value === "number" && raw >= value;
    case "<":
      return typeof raw === "number" && typeof value === "number" && raw < value;
    case "<=":
      return typeof raw === "number" && typeof value === "number" && raw <= value;
    case "in":
      return Array.isArray(value) && value.includes(raw);
    case "not_in":
      return Array.isArray(value) && !value.includes(raw);
    case "contains":
      if (typeof raw === "string" && typeof value === "string") {
        return raw.includes(value);
      }
      return Array.isArray(raw) && raw.includes(value);
    case "between": {
      if (
        Array.isArray(value) &&
        value.length === 2 &&
        typeof raw === "number" &&
        typeof value[0] === "number" &&
        typeof value[1] === "number"
      ) {
        return raw >= value[0] && raw <= value[1];
      }
      return false;
    }
    default:
      return false;
  }
}

/**
 * Execution Dataset = 定义固定条件 AND 执行追加条件 之后的行集合。
 * 只读 Snapshot 内部冻结的 definition/execution，不回读活对象。
 */
export function formExecutionDataset(
  rows: RowRecord[],
  definitionConditions: Condition[],
  executionConditions: Condition[]
): RowRecord[] {
  const allConditions = [...definitionConditions, ...executionConditions];

  return rows.filter((row) =>
    allConditions.every((condition) => evaluateCondition(row, condition))
  );
}

function compare(
  left: number | string | null,
  operator: "=" | "!=" | ">" | ">=" | "<" | "<=",
  right: number | string | null
): boolean {
  if (left === null || right === null) return false;
  switch (operator) {
    case "=": return left === right;
    case "!=": return left !== right;
    case ">":
      return typeof left === "number" && typeof right === "number" && left > right;
    case ">=":
      return typeof left === "number" && typeof right === "number" && left >= right;
    case "<":
      return typeof left === "number" && typeof right === "number" && left < right;
    case "<=":
      return typeof left === "number" && typeof right === "number" && left <= right;
  }
}

function fieldValue(node: { field: string; scope?: "currentRow" }, currentRow?: RowRecord, candidateRow?: RowRecord): number | string | null {
  const row = node.scope === "currentRow" ? currentRow : candidateRow ?? currentRow;
  if (!row) return null;
  const value = row[node.field];
  return typeof value === "number" || typeof value === "string" ? value : null;
}

function evaluateFilter(
  node: FilterNode,
  rows: RowRecord[],
  currentRow: RowRecord | undefined,
  byId: Map<string, CalculationNode>
): RowRecord[] {
  const input = byId.get(node.input);

  let dataset: RowRecord[];
  if (input?.kind === "execution_dataset") {
    dataset = rows;
  } else if (input?.kind === "filter") {
    dataset = evaluateFilter(input, rows, currentRow, byId);
  } else {
    throw new Error(`Filter ${node.id} 的输入必须是 execution_dataset 或 filter`);
  }

  return dataset.filter((candidateRow) => {
    const { left, right } = node.condition;

    const resolveOperand = (operand: typeof left): number | string | null => {
      if (operand.kind === "constant") return operand.value;
      return fieldValue(operand, currentRow, candidateRow);
    };

    return compare(resolveOperand(left), node.condition.operator, resolveOperand(right));
  });
}

function evaluateAggregate(
  node: AggregateNode,
  rows: RowRecord[],
  currentRow: RowRecord | undefined,
  byId: Map<string, CalculationNode>,
  warnings: ExecutionWarning[]
): number | null {
  const input = byId.get(node.input);
  let dataset: RowRecord[];

  if (input?.kind === "execution_dataset") {
    dataset = rows;
  } else if (input?.kind === "filter") {
    dataset = evaluateFilter(input, rows, currentRow, byId);
  } else {
    throw new Error(`Aggregate ${node.id} 的输入必须是 execution_dataset 或 filter`);
  }

  if (node.aggregate === "count") {
    return dataset.length;
  }

  if (dataset.length === 0) {
    warnings.push({
      nodeId: node.id,
      message: `Aggregate ${node.id}（${node.aggregate}）作用于空数据集，结果为 null`
    });
    return null;
  }

  const totalRecords = dataset.length;
  const values = node.field
    ? dataset
        .map((row) => row[node.field!])
        .filter((value): value is number => typeof value === "number")
    : [];

  // 检查是否有非数值被静默丢弃
  if (node.field && totalRecords > 0) {
    const nonNumericCount = totalRecords - values.length;
    if (nonNumericCount > 0) {
      warnings.push({
        nodeId: node.id,
        message: `Aggregate ${node.id}（${node.aggregate}）字段 ${node.field} 存在 ${nonNumericCount} 条非数值记录，已忽略`
      });
    }
  }

  if (values.length === 0) {
    warnings.push({
      nodeId: node.id,
      message: `Aggregate ${node.id}（${node.aggregate}）没有可聚合的数值`
    });
    return null;
  }

  switch (node.aggregate) {
    case "sum": return values.reduce((a, b) => a + b, 0);
    case "avg": return values.reduce((a, b) => a + b, 0) / values.length;
    case "min": return Math.min(...values);
    case "max": return Math.max(...values);
  }
}

function evaluateScalar(
  node: CalculationNode,
  rows: RowRecord[],
  currentRow: RowRecord | undefined,
  byId: Map<string, CalculationNode>,
  warnings: ExecutionWarning[],
  cache: Cache
): number | string | null {
  const cacheKey = `${node.id}::${currentRow ? (currentRow.__rowIndex as number ?? "row") : "static"}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey) as number | string | null;

  let value: number | string | null = null;

  switch (node.kind) {
    case "constant":
      value = node.value;
      break;
    case "field_ref":
      value = fieldValue(node, currentRow, undefined);
      break;
    case "aggregate":
      value = evaluateAggregate(node, rows, currentRow, byId, warnings);
      break;
    case "arithmetic": {
      const left = byId.get(node.left);
      const right = byId.get(node.right);
      const a = left ? evaluateScalar(left, rows, currentRow, byId, warnings, cache) : null;
      const b = right ? evaluateScalar(right, rows, currentRow, byId, warnings, cache) : null;

      if (a === null || b === null) {
        warnings.push({ nodeId: node.id, message: `算术节点 ${node.id} 的操作数为 null` });
        value = null;
        break;
      }
      if (typeof a === "string" || typeof b === "string") {
        warnings.push({ nodeId: node.id, message: `算术节点 ${node.id} 的操作数必须是数值` });
        value = null;
        break;
      }

      switch (node.operator) {
        case "+": value = a + b; break;
        case "-": value = a - b; break;
        case "*": value = a * b; break;
        case "/":
          if (b === 0) {
            warnings.push({ nodeId: node.id, message: `算术节点 ${node.id} 除数为 0，结果为 null` });
            value = null;
          } else {
            value = a / b;
          }
          break;
      }
      break;
    }
    default:
      value = null;
  }

  cache.set(cacheKey, value);
  return value;
}

export function executeSnapshot(
  snapshot: CalculationSnapshot,
  rows: RowRecord[]
): ResultSet {
  const validationErrors = validateGraph(snapshot.graph);
  const fatal = validationErrors.filter(
    (error) => error.code === "cycle" || error.code === "dangling_reference"
  );
  if (fatal.length > 0) {
    throw new Error(`Graph 非法，无法执行：${fatal.map((e) => e.message).join("；")}`);
  }

  const { graph, execution } = snapshot;
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const warnings: ExecutionWarning[] = [...validationErrors.map((e) => ({ message: e.message, nodeId: e.nodeId }))];
  const cache: Cache = new Map();

  // D-116：Execution Dataset = Definition 固定条件 AND Execution 本次条件
  const dataset = formExecutionDataset(
    rows,
    snapshot.definition.conditions,
    snapshot.execution.conditions
  );

  if (dataset.length === 0) {
    return {
      id: `rs-${snapshot.id}`,
      snapshotId: snapshot.id,
      period: execution.period,
      items: [],
      status: "missing",
      warnings: ["Execution Dataset 为 0 行，本次执行无结果（缺失 ≠ 0）"]
    };
  }

  const outputs = graph.nodes.filter((node): node is OutputColumnNode => node.kind === "output_column");
  const items: ResultItem[] = [];

  for (const output of outputs) {
    if (output.distribution === "perGroup") {
      // perGroup 未在本阶段实现：不伪造结果，以 warning 显式标记（INV-075 不说谎）
      warnings.push({
        nodeId: output.id,
        message: `Output ${output.name} 声明 perGroup，当前未实现，未产出结果`
      });
      continue;
    }

    const source = byId.get(output.source);
    if (!source || source.kind === "execution_dataset") {
      warnings.push({ nodeId: output.id, message: `输出 ${output.name} 缺少有效来源` });
      continue;
    }

    if (output.distribution === "perDataset") {
      const value = evaluateScalar(source, dataset, undefined, byId, warnings, cache);
      items.push(makeResultItem(output, value, undefined, snapshot, "dataset"));
      continue;
    }

    // perRow（对 Execution Dataset 的每一行）
    dataset.forEach((row, index) => {
      const tagged = { ...row, __rowIndex: index };
      const value = evaluateScalar(source, dataset, tagged, byId, warnings, cache);
      items.push(makeResultItem(output, value, row, snapshot, `row-${index}`));
    });
  }

  return {
    id: `rs-${snapshot.id}`,
    snapshotId: snapshot.id,
    period: execution.period,
    items,
    status: "complete",
    warnings: warnings.map((w) => w.message)
  };
}

function makeResultItem(
  output: OutputColumnNode,
  value: number | string | null,
  row: RowRecord | undefined,
  snapshot: CalculationSnapshot,
  suffix: string
): ResultItem {
  const numeric = typeof value === "number" ? value : null;

  const dimensions: Record<string, string> = {};
  if (row) {
    for (const field of snapshot.resultDimensions) {
      const raw = row[field];
      if (typeof raw === "string" || typeof raw === "number") {
        dimensions[field] = String(raw);
      }
    }
  }

  return {
    id: `ri-${snapshot.id}-${output.id}-${suffix}`,
    value: numeric,
    dimensions,
    granularity:
      output.distribution === "perRow"
        ? "row"
        : output.distribution === "perDataset"
          ? "aggregate"
          : "group",
    outputColumnName: output.name,
    roleInGraph: output.role
  };
}

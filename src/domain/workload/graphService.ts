import type { CalculationGraph, CalculationNode } from "./types";

export interface GraphValidationError {
  code: "cycle" | "dangling_reference" | "aggregate_needs_dataset" | "output_needs_source" | "invariant_violation";
  message: string;
  nodeId?: string;
}

function referencedNodeIds(node: CalculationNode): string[] {
  switch (node.kind) {
    case "filter":
      return node.input ? [node.input] : [];
    case "aggregate":
      return node.input ? [node.input] : [];
    case "arithmetic":
      return [node.left, node.right].filter((id): id is string => Boolean(id));
    case "output_column":
      return node.source ? [node.source] : [];
    default:
      return [];
  }
}

/**
 * V1 约束：
 * - DAG，禁止循环引用
 * - aggregate.input 必须指向 execution_dataset 或 filter
 * - output_column.source 必须指向一个求值节点（field_ref/constant/aggregate/arithmetic）
 * - filter 仅作数据集节点，必须通过 aggregate 转换为数值后才能输出
 * - perDataset 输出不得依赖 currentRow
 * - AggregateNode 不持有 rowContextField（职责归 Filter Condition）
 */
export function validateGraph(graph: CalculationGraph): GraphValidationError[] {
  const errors: GraphValidationError[] = [];
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));

  for (const node of graph.nodes) {
    for (const referenceId of referencedNodeIds(node)) {
      if (!nodeById.has(referenceId)) {
        errors.push({
          code: "dangling_reference",
          message: `Node ${node.id} references missing node ${referenceId}`,
          nodeId: node.id
        });
      }
    }

    if (node.kind === "aggregate") {
      const inputId = node.input;
      if (!inputId) {
        errors.push({
          code: "aggregate_needs_dataset",
          message: `Aggregate ${node.id} 缺少 input`,
          nodeId: node.id
        });
      } else {
        const input = nodeById.get(inputId);
        if (input && input.kind !== "execution_dataset" && input.kind !== "filter") {
          errors.push({
            code: "aggregate_needs_dataset",
            message: `Aggregate ${node.id} 必须作用于 execution_dataset 或 filter，得到 ${input.kind}`,
            nodeId: node.id
          });
        }
      }
      if ("rowContextField" in node) {
        errors.push({
          code: "invariant_violation",
          message: `Aggregate ${node.id} 不得携带 rowContextField（由 Filter 承载逐行条件）`,
          nodeId: node.id
        });
      }
    }

    if (node.kind === "output_column" && node.source) {
      const source = nodeById.get(node.source);
      if (
        source &&
        source.kind !== "field_ref" &&
        source.kind !== "constant" &&
        source.kind !== "aggregate" &&
        source.kind !== "arithmetic"
      ) {
        errors.push({
          code: "output_needs_source",
          message: `OutputColumn ${node.id} 的 source 不能是 ${source.kind}（只能是 field_ref/constant/aggregate/arithmetic）`,
          nodeId: node.id
        });
      }

      if (node.distribution === "perDataset" && node.source && dependsOnCurrentRow(graph, node.source)) {
        errors.push({
          code: "invariant_violation",
          message: `perDataset 输出列 ${node.name} 不得依赖 currentRow`,
          nodeId: node.id
        });
      }

      if (node.distribution === "perGroup") {
        errors.push({
          code: "invariant_violation",
          message: `输出 ${node.name} 声明 perGroup，当前未实现（保留语义占位）`,
          nodeId: node.id
        });
      }
    }
  }

  // 环检测：Kahn 拓扑排序
  const indegree = new Map<string, number>();
  for (const node of graph.nodes) indegree.set(node.id, 0);
  for (const node of graph.nodes) {
    for (const referenceId of referencedNodeIds(node)) {
      if (nodeById.has(referenceId)) {
        indegree.set(referenceId, (indegree.get(referenceId) ?? 0) + 1);
      }
    }
  }

  const queue = graph.nodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id);
  let visited = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    visited += 1;
    for (const node of graph.nodes) {
      if (referencedNodeIds(node).includes(current)) {
        const next = (indegree.get(node.id) ?? 0) - 1;
        indegree.set(node.id, next);
        if (next === 0) queue.push(node.id);
      }
    }
  }

  if (visited !== graph.nodes.length) {
    errors.push({
      code: "cycle",
      message: "Graph 含有循环引用"
    });
  }

  return errors;
}

export function dependsOnCurrentRow(
  graph: CalculationGraph,
  nodeId: string,
  visited: Set<string> = new Set()
): boolean {
  if (visited.has(nodeId)) return false;
  visited.add(nodeId);

  const node = graph.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return false;

  if (node.kind === "field_ref" && node.scope === "currentRow") return true;

  if (node.kind === "filter" && node.condition) {
    const { left, right } = node.condition;
    for (const operand of [left, right]) {
      if (operand && operand.kind === "field_ref" && operand.scope === "currentRow") return true;
    }
  }

  for (const referenceId of referencedNodeIds(node)) {
    if (dependsOnCurrentRow(graph, referenceId, visited)) return true;
  }

  return false;
}
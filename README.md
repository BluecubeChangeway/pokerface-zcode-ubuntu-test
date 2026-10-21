# 医院绩效卡牌系统 — 独立开发线（Independent Development Line）

> 本仓库是"医院绩效卡牌系统"的**独立开发对照组工作副本**，源自 2026-10-10 固定起点快照
> `poker-face-handover-snapshot-2026-10-10`（字节忠实副本，101 文件，SHA-256 已按
> `MANIFEST/file-inventory.txt` 校验全绿）。快照目录保持只读；一切开发发生在本仓库；
> 本线不追踪、不回写任何平行主线。

## 环境要求

| 项 | 要求 | 说明 |
|---|---|---|
| Node | `>=22.14.0 <23`（见 `package.json` engines） | 本线实测 v22.22.3；快照生成机实测 v22.14.0，两者均经全量验证 |
| npm | 随 Node 附带（本线实测 12.1.0） | 需网络访问 npm registry（依赖约 135M） |
| OS | 跨平台（Windows / macOS / Linux） | 纯前端 + vitest，无平台特定文件 |

`.nvmrc` 锚定本线实测版本；使用 nvm 时 `nvm use` 即可。

## 启动与验证

```bash
npm ci          # 依据 package-lock.json 精确复现依赖树
npm run dev     # Vite dev server（http://localhost:5173，Runtime 验证竖切片 UI）
npm run verify  # 一键全量验证链：typecheck + test + build
```

`npm run verify` 预期：typecheck exit 0；**Tests 424/424（24 文件）全绿**（基线随开发演进，
以 `AGENT/AGENT_STATUS.md` 记录为准）；build exit 0（产物入 `dist/`）。

任何一项失败：先核对依赖完整性（重跑 `npm ci`）与 Node 版本，再怀疑代码；
不要修改测试断言来"让测试通过"。

## 验证结果的含义边界（必读）

- 424/424 是 **MockDataService 内存环境的行为级基线**：真实操作路径 + 真实持久化编排 +
  内存存储。**测试通过 ≠ 生产就绪**。
- 生产 DataService 适配器（含 deleteCards/deleteWorkloadResults）、数据库事务与并发控制
  **未实现**，为已记录的生产阻塞项（U-04）。
- Mock ≠ 生产：不得把内存行为写入任何"生产就绪"结论。

## 目录速览

```text
AGENT/                 ← 本线自有记录层（状态 / 路线图 / 假设台账），独立线义务
src/domain/            ← 领域模型与服务（业务语义唯一事实源，UI 不得反向决定语义）
src/services/          ← 应用服务层（ActionExecutor / 各 Trigger / 撤回入口 / DataService）
src/stores/            ← Zustand stores
src/app/               ← Runtime 验证竖切片 UI（不是正式产品 UI，受 8-Gate 契约约束）
src/mock/              ← Mock 数据与测试适配层（生产代码禁止 import）
src/tests/             ← vitest 测试
```

开发前必读（按序）：`PROJECT_STATUS.md` → `Q-01-Q-09_DECISION_LEDGER.md` →
`PROJECT_MASTER_CONTEXT.md` → `PROJECT_WORKING_KNOWLEDGE.md` → `AGENTS.md` →
涉及任务时 `AGENT/AGENT_STATUS.md` + `AGENT/ROADMAP.md`。

## 引用与纪律（硬规则摘要）

- 引用决策必须 `D-xxx@来源文件#标题`（DECISIONS.md 旧体系与 Ledger 同号不同义，不得混用）。
- 一般业务语义未决 → 按假设协议自主推进并记录五项必填；真实数据 / 生产 / 凭据 /
  外部服务 / 不可逆操作 → 停下请求授权。
- 不得静默修改已封板语义（Q-01～Q-09、D-001～D-158@Ledger）；假设一律 `[假设]` 标注。
- 正式 UI 受 `docs/UI_DESIGN_OPERATING_CONTRACT.md` 8-Gate 约束：DESIGN HANDOFF 前禁止实现正式 UI。

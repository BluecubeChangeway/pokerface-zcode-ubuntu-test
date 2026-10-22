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

## 本地数据文件夹服务（R4a 阶段 1）

用户裁定（2026-10-22）：本项目数据具"工程资源"特质，**存于指定文件夹、不进浏览器**；
未来云端备份从该文件夹同步；阶段 3/4 再议本地存储作为缓存还是主数据源（A-004）。

```bash
npm run server   # 启动本地数据服务（零依赖 Node 进程）
```

- 默认数据文件夹：`./poker-face-data/`（可用 `POKER_FACE_DATA_DIR` 指定任意
  用户自定路径，`POKER_FACE_PORT` 改端口，默认 8787）；
- 存储形态：每个数据集合一个 JSON 文件（人可检视、可直接备份/同步），
  写入即落盘（原子写，断电最多丢最后一次写入，不产生半写文件）；
- 数据文件损坏时**拒绝启动、保护现场**（不静默清空）；
- 语义与内存版一致：保存 = 按 id 替换或追加；删除 = 按 id 移除、缺失不报错（重试安全）；
- 前端适配器：`src/services/LocalFolderDataService.ts`（实现 DataService 接口，
  经 HTTP 访问本服务）；
- **App 已接入（R4a-2）**：`npm run server` + `npm run dev:local`（两个终端），
  界面即使用文件夹数据（右下"数据来源"面板显示"本地文件夹服务"）；
  日常开发仍用 `npm run dev`（内存演示版，刷新即失）；
- **演示数据（方案 B，用户裁定）**：本地后端首启为空白（不伪造数据）；
  文件夹为空时界面提供"灌入演示数据"按钮（重复灌入 = 重置为演示初始
  状态）；随时可"清除演示数据"——精确删除演示链自身的数据，
  **你自建的卡、关系、拆分产物不受影响**；
- 本服务为单用户单实例（V1）；多用户授权属阶段 3（R4c），届时另行设计。

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

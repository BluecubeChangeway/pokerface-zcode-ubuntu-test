# AGENT_STATUS.md — 独立开发线 Agent 状态

> 本文件是独立开发对照组 Agent 的自有状态记录（03-PARALLEL-RULES §2 义务）。
> 供下一次会话的 Agent（或本 Agent 续接）在不依赖聊天历史的情况下恢复工作。
> 本文件不修改快照内任何权威文件；与权威文件冲突时以权威文件为准。

## 1. 身份与路径

| 项 | 值 |
|---|---|
| Agent | ZCode（GLM 容器），2026-10-21 经用户授权承接原 ChatGPT 对话记忆（人格同化） |
| 冻结快照（只读） | `/home/asura/桌面/poker-face-handover-snapshot-2026-10-10/` |
| 本工作副本 | `/home/asura/poker-face-work/`（git main，独立线，不回写任何主线） |
| 快照身份 | 2026-10-10 固定起点；源 HEAD 8450c098 + 59 条未提交变更（对应 D-150~D-158 时代工作区状态） |

## 2. 冷启动验证记录（2026-10-21 实测）

| 步骤 | 命令 | 结果 |
|---|---|---|
| 源码复制 | `cp -a 05-SOURCE-COPY/. /home/asura/poker-face-work/` | 101 文件 |
| SHA-256 校验 | 04-RESTORE-VERIFY §1 脚本 | **通过**：路径集合/数量/字节数/哈希全部一致 |
| 依赖安装 | `npm ci` | 成功（Node v22.22.3，npm 12.1.0；与生成机 v22.14.0 小版本不同，全量验证后判定可用） |
| 类型检查 | `npm run typecheck` | **PASS**（exit 0） |
| 测试基线 | `npm test` | **424/424 PASS（24 文件）**——与快照声明基线一致 |
| 构建 | `npm run build` | **PASS**（dist/ 产出） |
| Git 基线 | `git init -b main` + 首提交 | 101 文件入库（node_modules/dist 按 .gitignore 排除） |

边界（如实记录）：424/424 是 MockDataService 内存环境的行为级基线，不代表生产就绪；生产 DataService 适配器、事务与并发未实现（生产阻塞不变）。

## 3. 当前状态（一句话）

**2026-10-22 第二轮：App 已接入本地文件夹存储（R4a-2 完成，方案 B 演示数据策略）——`npm run server` + `npm run dev:local` 即用落盘数据，日常开发仍可用内存版；基线 454/454（29 文件）全绿。下一项：R3 拆分溯源设计报告（A-003 语义已裁定）已呈报待用户复核，随后按批复实施；浏览器端全链路 QA（browser-use）留待 UI 阶段。**

## 2.5 开发推进记录

| 轮次 | 日期 | 内容 | 验证 | 提交 |
|---|---|---|---|---|
| R0 | 2026-10-21 | 工程可复现性基础设施（U-10）：README / .nvmrc / engines >=22.14.0 <23 / `npm run verify` 一键链 | verify exit 0，424/424 | 见 git log "R0:" |
| R1 | 2026-10-21 | D-151 剩余① 撤回后自动重新 Resolution 接线（初版方案 A） | 新增 revocationAutoResubmit.test.ts 7 项全绿；全量 431/431（25 文件） | 见 git log "R1:" |
| R1b+R2 | 2026-10-21 | 用户四项裁决落地：A-001→方案 B（重推范围纳入 retained 子卡配对）；R2 移动/解除关系运行时服务（moveRelationEntry：解除软删 + 幂等新建 + 旧配对反馈失效 + 新配对自动重推，submitMoveAssignRelation 持久化入口） | revocationAutoResubmit 7 项更新 + moveRelation.test.ts 8 项全绿；全量 439/439（26 文件） | 见 git log "R2:" |
| 裁决关闭+R4a | 2026-10-22 | CONFLICT-001 经用户澄清关闭（"罪恶之树"指向完全撤回=D-158 已实现语义；D-153 层撤回维持不变，零代码变更）；R4a 本地文件夹存储引擎完成（用户修订：不进浏览器、存指定文件夹）：local-server/server.mjs（零依赖 Node 服务、原子写、损坏保护、重启恢复）+ LocalFolderDataService 适配器 + npm run server | localFolderDataService.test.ts 7 项全绿（upsert 等价/删除 no-op/按 id getter/重启持久化/空态不伪造/损坏保护）；全量 446/446（27 文件）；独立进程冒烟实测：落盘 JSON 人可检视、杀进程重启数据完整恢复 | 见 git log "R4a:" |
| R4a-2 | 2026-10-22 | App 接入本地文件夹存储（方案 B：空文件夹首启空白 + 一键灌入/清除演示数据，清除精确按演示链 id、用户自建数据不受影响）：runtimeDataService 双档工厂（VITE_DATA_BACKEND，mock 档复用既有单例——既有 spy 测试零扰动）+ demoSeeder + App 数据源面板（后端标识/连接错误/播种按钮）+ dev:local 脚本 + vite-env 类型声明 | runtimeBackend.test.ts 6 项（工厂双档/播种全集合/幂等/清除保用户数据）+ dataSourcePanel.dom.test.ts 2 项全绿；全量 454/454（29 文件）/ typecheck / build 全绿 | 见 git log "R4a-2:" |

**待裁决（无）**：CONFLICT-001 已于 2026-10-22 经用户澄清关闭，现行语义与用户确认完全一致。

**下一项工作**：
1. R4a-2 App 接入：App 运行时数据源从 Mock 切换至本地文件夹服务（含种子数据策略——演示链数据如何进入文件夹、空文件夹首启体验、启动编排（server+dev 一键）），实施前以场景呈报用户选择接入节奏。
2. R3 拆分溯源设计报告（A-003 语义已裁定）：结构化 (数据本源, 筛选条件组) 溯源 + 跨批次匹配复用服务设计，场景式呈报后实施。

## 4. 下一步候选（详见系统记忆 next-work-candidates 与快照 02-OPEN-ITEMS）

- D-151 剩余 ①：撤回后自动重新 Resolution 接线（配对范围假设需五项记录）
- D-157 实现（前置：拆分原则结构化表达、渠道模型、跨批次匹配复用服务）
- D-151 剩余 ②：移动/解除关系语义（未裁定——需实际场景向用户裁决）
- 生产 DataService 删除接口（生产阻塞项）
- U-10 工程可复现性基础设施（.nvmrc/engines/README——低风险）

## 5. 运行纪律备忘（每次会话开工前自查）

1. 快照目录只读；一切修改只发生在本工作副本。
2. 引用决策必须 `D-xxx@来源文件#标题`（双编号体系冲突未裁定）。
3. 一般语义未决 → 假设协议五项必填；真实数据/生产/凭据/外部/不可逆 → 停下请求授权。
4. 正式 UI 受 docs/UI_DESIGN_OPERATING_CONTRACT.md 8-Gate 约束，DESIGN HANDOFF 前禁止正式 UI 实现。
5. 与用户交流复杂裁决用实际场景/示例，不用纯工程语言。
6. 每轮结束：更新本文件 + 提交 git + 记录未决事项。

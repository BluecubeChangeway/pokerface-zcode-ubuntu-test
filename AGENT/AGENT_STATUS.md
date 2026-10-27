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

**2026-10-27：用户四点反馈 + 设计批复全部落地——开关修复/A-009½ structure 接线/A-007 预算推荐三类型/A-010 聚焦模式全部实施实测（495/495 全绿，38 文件）。A-009 第二半（单元按对应表拆分）待下一轮专项实施（模拟映射数据 + 推荐确认流 + 建卡链）。**

## 2.5 开发推进记录

| 轮次 | 日期 | 内容 | 验证 | 提交 |
|---|---|---|---|---|
| R0 | 2026-10-21 | 工程可复现性基础设施（U-10）：README / .nvmrc / engines >=22.14.0 <23 / `npm run verify` 一键链 | verify exit 0，424/424 | 见 git log "R0:" |
| R1 | 2026-10-21 | D-151 剩余① 撤回后自动重新 Resolution 接线（初版方案 A） | 新增 revocationAutoResubmit.test.ts 7 项全绿；全量 431/431（25 文件） | 见 git log "R1:" |
| R1b+R2 | 2026-10-21 | 用户四项裁决落地：A-001→方案 B（重推范围纳入 retained 子卡配对）；R2 移动/解除关系运行时服务（moveRelationEntry：解除软删 + 幂等新建 + 旧配对反馈失效 + 新配对自动重推，submitMoveAssignRelation 持久化入口） | revocationAutoResubmit 7 项更新 + moveRelation.test.ts 8 项全绿；全量 439/439（26 文件） | 见 git log "R2:" |
| 裁决关闭+R4a | 2026-10-22 | CONFLICT-001 经用户澄清关闭（"罪恶之树"指向完全撤回=D-158 已实现语义；D-153 层撤回维持不变，零代码变更）；R4a 本地文件夹存储引擎完成（用户修订：不进浏览器、存指定文件夹）：local-server/server.mjs（零依赖 Node 服务、原子写、损坏保护、重启恢复）+ LocalFolderDataService 适配器 + npm run server | localFolderDataService.test.ts 7 项全绿（upsert 等价/删除 no-op/按 id getter/重启持久化/空态不伪造/损坏保护）；全量 446/446（27 文件）；独立进程冒烟实测：落盘 JSON 人可检视、杀进程重启数据完整恢复 | 见 git log "R4a:" |
| R4a-2 | 2026-10-22 | App 接入本地文件夹存储（方案 B：空文件夹首启空白 + 一键灌入/清除演示数据，清除精确按演示链 id、用户自建数据不受影响）：runtimeDataService 双档工厂（VITE_DATA_BACKEND，mock 档复用既有单例——既有 spy 测试零扰动）+ demoSeeder + App 数据源面板（后端标识/连接错误/播种按钮）+ dev:local 脚本 + vite-env 类型声明 | runtimeBackend.test.ts 6 项（工厂双档/播种全集合/幂等/清除保用户数据）+ dataSourcePanel.dom.test.ts 2 项全绿；全量 454/454（29 文件）/ typecheck / build 全绿 | 见 git log "R4a-2:" |
| R3 | 2026-10-22 | **拆分溯源与跨批次复用实施完成**（用户批准设计 + Q1～Q3 批复：渠道=取用科室经 dimensions / 复用忽略新名 / 面板可见展示）：SplitProvenanceRecord 溯源（随 confirm_split 落盘、撤回不删、upsert 幂等）+ 执行器复用判定（同源+同锚点+同维度+同内容且存活 → 复用；retry 身份纪律：产物死亡明确拒绝不换身份）+ 提交阶段存活卡复用（不建第二张卡）+ previewSplitReuse 确认面板可见展示；DataService 接口 +2 方法（Mock/Local/服务端第 14 集合） | splitReuse.test.ts 5 项（两科室同拆复用/层撤回后重拆 retained 复用+失效新建/部分选择按需复用/同批次重试幂等/产物死亡重试拒绝）全绿；splitReconfirm.dom 按裁定语义重锚定（保留防覆盖守卫）；全量 459/459（30 文件）/ typecheck / build 全绿 | 见 git log "R3:" |
| UI-准备+QA | 2026-10-23 | 用户 UI 期望登记（UI-READINESS.md：四独立界面/多语言/主题/动效/布局 + 接线点清单 + 就绪度评估）+ 出生证撤回语义问询答复（Q-PROV-001：推荐保留，待用户确认）+ **浏览器全链路实测**：发现并修复 2 个真实缺陷——①local-server CORS 预检缺失（浏览器跨源请求被拦截，补 OPTIONS+跨源头）；②canvasBootstrap 先置标记风险到期（PROJECT_STATUS §16 Deferred 项，空文件夹首启烧掉一次性标记、灌入后画布不出现，修复=放置成功才置标记）。实测通过：本地后端标识/空态首启/灌入/清除/再灌入即显画布/真实拖放→P2-1 幂等 assign→Resolution→推荐与详情/撤回预览→确认全链/文件级落盘 | 修复后全量 459/459（30 文件）全绿；canvasBootstrap+面板测试 11 项通过 | 见 git log "QA:" |
| A-002b 裁定落地 | 2026-10-23 | **拖出即解除 + 槽间移动全链实现并实测**（用户四项裁定：①新建卡牌暂不解封保持现状；②"卡包"澄清为卡槽=既有功能；③拖出槽外即解除（最终位置判定：画布/卡盒=纯解除、其他槽=移动）；④演示数据补——查明层级本就存在，实际堵点=医生维度证据）：unassignWorkloadCard 解除服务（软删留痕+配对失效+不重推+幂等）+ submitUnassignRelation 持久化入口 + dropInteraction 来源标记路由（Deck/槽双源）+ App 槽内卡芯片渲染（active assign 投影）+ 画布/卡盒槽外解除目标 + deriveMappingEvidences 补 doctorId 维度通道（D-122 按医生拆分的证据实现）+ 演示链补医生观测行（王 200/李 220 既有事实） | unassignMoveDrop.test.ts 9 项全绿；2 个证据门守卫按增补数据重锚定（守卫意图保留且更精确）；全量 468/468（31 文件）/ typecheck / build 全绿；浏览器实测：芯片渲染/拖出解除（磁盘留痕验证）/Deck 建关系/槽间移动+新配对自动重推全通过；昨日用户数据经"清除演示数据"存活（清除精确性实证） | 见 git log "A-002b:" |
| A-005+U-UI-10+R4b 设计 | 2026-10-23 | 护理组门诊数字裁定不补（A-005：拆分建议演示保持诚实缺证据状态）；Q-PROV-001 出生证保留按推荐默认关闭；**画布卡片拖动重定位（U-UI-10 最小版）实现并实测**：单元卡 draggable（芯片 dragstart 冒泡守卫）→ 画布根统一 drop（移动 payload 优先/其余走解除判定）→ computeDropPlacement 纯函数（坐标换算+边界夹取+NaN 防御）；槽 drop 增加 stopPropagation（防画布根重复处理）；**R4b 闲时备份设计稿**完成呈报（backups/ 时间戳全量快照 + 手动触发 + 恢复前自动快照 + 全量替换语义待批复） | canvasMove.dom.test.ts 2 项全绿；全量 470/470（32 文件）/ typecheck / build 全绿；真实浏览器实测：drop 坐标 (520,400)−画布原点 → 卡片落点 (255.22, 300.19) 分毫不差 | A-005+U-UI-10+R4b 设计 | 2026-10-23 | 护理组门诊数字裁定不补（A-005：拆分建议演示保持诚实缺证据状态）；Q-PROV-001 出生证保留按推荐默认关闭；**画布卡片拖动重定位（U-UI-10 最小版）实现并实测**：单元卡 draggable（芯片 dragstart 冒泡守卫）→ 画布根统一 drop（移动 payload 优先/其余走解除判定）→ computeDropPlacement 纯函数（坐标换算+边界夹取+NaN 防御）；槽 drop 增加 stopPropagation（防画布根重复处理）；**R4b 闲时备份设计稿**完成呈报（backups/ 时间戳全量快照 + 手动触发 + 恢复前自动快照 + 全量替换语义待批复） | canvasMove.dom.test.ts 2 项全绿；全量 470/470（32 文件）/ typecheck / build 全绿；真实浏览器实测：drop 坐标 (520,400)−画布原点 → 卡片落点 (255.22, 300.19) 分毫不差 | 见 git log "U-UI-10:" |
| R4b 备份实施 + 界面反馈登记 | 2026-10-26 | **备份/恢复全链实施并实测**（用户批准设计：全量替换+恢复前自动快照）：server 三接口（POST /api/backup 原子写时间戳快照目录、GET /api/backups、POST /api/restore 先校验后预快照后全量替换）+ LocalFolderDataService 三方法（非 DataService 接口成员——存储层能力）+ 面板"立即备份/从备份恢复…/确认恢复"（恢复后数据与推荐面板同步重载）+ 三条界面反馈登记（U-UI-13 预算卡拖放=用户语义方向 B 类待实施、U-UI-14 单元按对应表拆分=C 类待设计稿、U-UI-15 卡牌盒底部/面板自动隐藏=D 类正式 UI） | r4bBackup.test.ts 3 项全绿（全量替换/预快照往返/损坏中止/缺名报错）；全量 473/473（33 文件）/ typecheck / build 全绿；浏览器实测：备份→清除（0 卡）→恢复（10 卡 4 芯片全回来）+ 恢复前快照自动生成；发现并修正实测环境问题（旧 server 进程无热重载，重启后接口可用） | 见 git log "R4b:" |
| U-UI-13 预算拖放 | 2026-10-26 | **预算卡拖放全链实现并实测**（用户语义方向："budget 卡与 workload 交互十分接近"）：handleBudgetCardDropOnUnitSlot（budget_assign 建立/复用，方向 Budget→Unit，无 Resolution——D-128 工作量域专属）+ budgetRelationEntry（move/unassign 预算镜像，无反馈/重推联动）+ dropInteraction 双载体统一路由（payload 分流 + 旧名兼容别名）+ App（Deck budget 卡可拖、budget 槽芯片、结果刷新）。裁定 A-006 入台账 | budgetDrop.test.ts 4 项全绿（建立/幂等+交叉静默/解除+移动+回原槽/幂等no-op+revoked拒绝）；全量 477/477（34 文件）/ typecheck / build 全绿；浏览器实测：拖入建关系→芯片出现→拖出解除（磁盘留痕）→重新拖入全链；槽间移动由测试覆盖（画布仅一 budget 槽） | 见 git log "U-UI-13:" |
| 四项裁定 + A-008 | 2026-10-26 | **用户四项新裁定入账（A-007~A-010）**：①预算解析/推荐+面板联动（C）；②Deck 消失/还原（B，"最早需求里明确过"）；③单元组织结构+按对应表拆分（C，三度补充详细场景）；④画布聚焦模式+双击聚焦+归位+一棵树（C，历史锚点核实：L3243/L3366/L3500/L6120/L6123/L18653/L19673/L25638）。**A-008 已实施并实测**：deckCardsOf 过滤（active workload_assign/budget_assign 投影，双向端点兼容）+ Deck 空态提示与"显示全部"切换 + App 接线 | deckHideAssigned.test.ts 5 项全绿（无参默认不变/解除还原/预算方向/含关联切换/revoked 不变）；全量 482/482（35 文件）/ typecheck / build 全绿；浏览器实测：已关联卡消失（4→隐藏 4 张）→ 拖入新卡即消失芯片出现 → 拖出解除自动还原 → "显示全部"切换 8 张全现 | 见 git log "A-008:" |
| 交互扩展设计报告 | 2026-10-26 | **三合一设计稿呈报**（AGENT/INTERACTION-EXTENSION-DESIGN.md）：A-007 预算推荐三类型（allocation-status/over-allocation/allocated-but-idle——全部为 Q-05 封板派生状态的展示接入，信息展示无 confirm 链）；A-009 第一半 structure 接线 B 类直接实施 + 第二半拆分推荐-确认流 + "科室对应表"模型推荐数据准备层定义；A-010 聚焦三态 + DEC-006 单击/双击重锚定标注 + 归位保留 placement 推荐 + 虚影简化 V1 只做一级关联 | — 呈报待批复 — | 见设计报告 |
| A-007+A-009½+A-010 实施 | 2026-10-27 | **用户四点反馈 + 设计批复全部落地**：①开关缺陷修复（hiddenDeckCount 恒定计算 + 持久双向"待用/已用"开关——用户确认未来保留）；②A-011 对应表=数据准备层裁定 + 模拟数据推进；③U-UI-20 单击看牌后牌让位（历史核实无裁定，新登记归 D 类）；④A-009 第一半单元拖入单元槽=structure 接线（Q-04 封板，4 项测试+浏览器实测护理组入外科芯片出现）；⑤A-007 预算推荐三类型（allocation-status/over-allocation/allocated-but-idle，Q-05 派生态展示接入，无执行链；反馈联动=解除失效+移动重分析，D-151 镜像；RecommendationKind 增 budget_status，5 项测试）；⑥A-010 画布聚焦模式（双击聚焦/一级关联/一棵树/取消按钮/placement 保留，DEC-006 重锚定单击查看双击聚焦，4 项 DOM 测试） | 全量 495/495（38 文件）/ typecheck / build 全绿；浏览器实测：护理组入外科槽芯片出现、单元拖入全链 | 见 git log "A-007:"/"A-010:" |

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

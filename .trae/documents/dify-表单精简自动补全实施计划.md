# VC查「短表单 + Dify自动补全」实施计划

## 1) Summary
- 目标：将当前 12 字段长表单重构为「3个核心输入」驱动的向导流程：`项目一句话介绍` + `目标机构` + `本轮目标融资金额`。
- 方式：在“下一步”时调用新的 Dify Workflow 进行结构化补全，回填其余字段，并允许用户快速编辑确认后再进入结果页。
- 边界：保持现有分步向导体验，不做激进交互改动；失败时回退到当前向导填写模式，确保可用性。

## 2) Current State Analysis
- 表单入口在 `app/page.tsx`，当前定义 12 个字段并按四步展示，提交前校验多个必填项。
- 表单提交将字段映射为 workflow 输入并写入 `sessionStorage.vccha_run_payload`，随后跳转 `app/result/page.tsx`。
- 结果页读取 payload 后调用 `service/index.ts` 的 `runWorkflow` 发起 SSE 工作流请求。
- 现有自动补全能力仅通过 `completion-messages` 封装（`service/index.ts` + `app/api/completion-messages/route.ts`），未接入当前首页向导。
- Dify 代理会话规范已具备（`app/api/utils/common.ts`），可直接复用用户标识与 session 机制。

## 3) Proposed Changes

### A. Dify Workflow 设计（新增一个“表单补全专用工作流”）
- 输入变量（3个）：
  - `one_line_summary`（项目一句话）
  - `target_investors`（目标机构列表，逗号拼接）
  - `funding_amount`（本轮目标融资金额，原始文本）
- 输出变量（结构化 JSON）：
  - `track`、`stage`、`monthly_revenue`、`arr`、`growth`、`burn_rate`、`current_runway`、`fund_usage`、`ask_for_investor`
  - `confidence`（0-1）
  - `missing_fields`（数组，标记低置信或无法推断项）
  - `reasoning_brief`（简短推断依据，给用户可读解释）
- 节点建议：
  1. **输入标准化节点**：清洗金额/机构文本，统一单位与术语。
  2. **行业与阶段推断节点**：从一句话描述提取赛道、阶段线索。
  3. **经营指标估计节点**：推断营收/增长/消耗/跑道（低置信时置空）。
  4. **融资用途与投资人诉求节点**：补全 `fund_usage`、`ask_for_investor`。
  5. **一致性校验节点**：检查字段间逻辑冲突（如阶段与营收体量明显不一致）。
  6. **结构化输出节点**：严格输出 JSON（无自然语言噪声）。
- Prompt 约束要点：
  - 优先“保守估计”，不编造不可推断事实；
  - 无依据时返回空值并加入 `missing_fields`；
  - 所有金额字段保留用户输入语义，不擅自硬转换。

### B. 前端流程重构（在现有向导基础上最小改动）
- 文件：`app/page.tsx`
- 变更策略：
  - **Step 1（核心输入）**：仅保留 3 个输入项（项目一句话、目标机构、融资金额）。
  - **Step 2（自动补全确认）**：展示工作流补全结果并允许编辑关键字段。
  - **Step 3（可选补充）**：仅展示 `missing_fields` 或用户想补充的项。
  - **Step 4（确认提交）**：沿用现有提交逻辑与跳转。
- 交互要点：
  - 点击“下一步”触发补全；补全中展示 loading 状态；
  - 保留现有 `TagInput` 的手动标签输入方式；
  - 若补全失败/低置信，退回当前向导模式（展开原有字段分步），符合“不要改太离谱”要求。

### C. API/BFF 设计（新增补全代理路由，避免前端直连 Dify）
- 新增文件：`app/api/workflows/prefill/route.ts`
- 作用：
  - 接收 3 个核心字段；
  - 调用 Dify 补全工作流（与 `app/api/workflows/run/route.ts` 同样复用 `createWorkflowClient`）；
  - 返回结构化补全结果（含 `confidence`、`missing_fields`）。
- 服务层扩展：
  - 文件：`service/index.ts`
  - 新增 `runPrefillWorkflow` 方法，供 `app/page.tsx` 调用。
- 配置扩展：
  - 文件：`config/index.ts`（或环境变量读取处）
  - 新增 `NEXT_PUBLIC_PREFILL_WORKFLOW_ID`（或同等配置）用于区分“补全工作流”与“结果分析工作流”。

### D. 字段映射与兼容
- 文件：`app/page.tsx`
- 保持现有 `toWorkflowInputs` 映射结构不变，仅调整字段来源：
  - 用户直填字段：`oneLineSummary`、`targetInvestors`、`fundingAmount`
  - 自动补全字段：其余字段默认由 prefill 结果填充
  - 用户编辑优先级高于自动补全值
- 文件：`app/result/page.tsx`
  - 原流程无需大改，仅确认 payload 字段完整性与缺省处理。

## 4) Assumptions & Decisions
- 决策：自动补全触发时机为“点下一步时”。
- 决策：自动补全结果“回填后可编辑确认”。
- 决策：目标机构继续采用手动标签输入，不改为自然语言抽取主路径。
- 决策：交付粒度包含可直接落地代码改造计划。
- 约束：整体保持当前向导风格，不做颠覆式页面改版。
- 假设：当前 Dify 侧可新建工作流并配置独立 workflow_id；仓库通过环境变量注入该 ID。

## 5) Verification Steps
- 功能验证：
  - 仅填写 3 个核心字段，点击下一步可获得结构化补全并回填；
  - 用户可编辑补全值，提交后结果页正常触发分析工作流。
- 降级验证：
  - 模拟补全接口失败/超时，页面自动回退到现有向导填法；
  - 低置信字段出现在 `missing_fields` 并提示用户补充。
- 兼容验证：
  - `session_id` 会话保持正常，SSE 结果页不受影响；
  - `sessionStorage.vccha_run_payload` 结构仍可被结果页解析。
- 回归验证：
  - 旧的完整填写路径仍可完成提交；
  - `TagInput` 粘贴分词与去重行为保持不变。

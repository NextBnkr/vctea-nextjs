# VC查（VC Match）开发协作说明

## 0. 先认识这个项目
- VC查是“VC 匹配助手”，面向创业者，不是金融交易平台。
- 目标：让用户在 30 秒内判断机构是否可能投资自己，减少无效约谈。
- 核心判断维度：是否真会投、方向是否匹配、机构是否有资金能力。

## 1. 你接手时需要知道什么
- 这是前后端混合的 Next.js 单仓库项目。
- 前端负责采集项目字段和展示报告，后端是 BFF（`app/api/**`）并代理 Dify。
- 当前无自建数据库，业务执行与核心数据依赖 Dify。
- 关键用户价值：VC 排雷、查看他人约谈经验、了解机构资金与方向动态。

## 2. 快速定位代码
- 页面入口：`app/page.tsx`（填写）与 `app/result/page.tsx`（结果）。
- API 入口：`app/api/**/route.ts`。
- 请求封装：`service/base.ts`、`service/index.ts`。
- 配置入口：`config/index.ts` 与 `.env.local`。

## 3. 后端接口最小清单
- `POST /api/workflows/run`：执行工作流（流式）。
- `POST /api/completion-messages`：补全消息。
- `GET /api/parameters`：应用参数。
- `POST /api/file-upload`：文件上传。
- `GET /api/messages`：会话消息。
- `POST /api/messages/[messageId]/feedbacks`：消息反馈。

## 4. 会话与安全约束
- 使用 `session_id` cookie 维持会话，不存在时后端生成 UUID。
- Dify user 统一格式：`user_${APP_ID}:${sessionId}`。
- 禁止在日志或前端输出任何密钥（尤其 `NEXT_PUBLIC_APP_KEY`）。

## 5. 本地运行与配置
- 必填环境变量：
  - `NEXT_PUBLIC_APP_ID`
  - `NEXT_PUBLIC_APP_KEY`
  - `NEXT_PUBLIC_API_URL`
  - `NEXT_PUBLIC_APP_TYPE_WORKFLOW`
- 运行命令：`npm run dev` / `npm run build` / `npm run start`。

## 6. 交互与UI基线（精简）
- 主题不变：amber + slate。
- 风格：轻玻璃、弱边框、少层级、移动优先。
- 信息策略：先摘要后展开，默认降低同屏信息密度。
- 动作层级：主按钮高对比，次按钮后退，避免多主动作并存。

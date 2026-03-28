# VC查：PWA 桌面留存引导实施计划

## 1) Summary
- 目标从“保存匹配报告到桌面 widget”收敛为“通过 H5 能力引导用户安装 PWA 到桌面”，并在首页 + 结果页双入口提升留存。
- 本次不实现“报告文件导出”、不实现“历史结果页”、不实现“浏览器通知订阅”。
- 交付重点：可安装的 PWA 基建（manifest + service worker + 注册）与安装引导 UI（支持 Chromium 安装弹窗与 iOS 手动引导文案）。

## 2) Current State Analysis
- 结果页主逻辑在 `app/result/page.tsx`，当前只有“返回修改表单/重新评估”动作，未提供安装引导入口。
- 首页在 `app/page.tsx`，当前动作为“开始查询/先完善资料”，未提供安装引导入口。
- `app/layout.tsx` 未声明 manifest 或主题色等 PWA 元信息，也未挂载 service worker 注册逻辑。
- 仓库无 `manifest.json` / `app/manifest.ts` / 业务 service worker，`public/` 下除 `favicon.ico` 外无 PWA 图标资源。
- 结论：当前不满足可安装 PWA 的最小条件，需补齐基础设施与引导交互。

## 3) Proposed Changes

### A. PWA 基础设施
1. 新增 `app/manifest.ts`
   - **What**：定义应用名称、short_name、start_url、display、theme/background color、icons、快捷入口（可选）。
   - **Why**：提供安装元信息，满足浏览器“添加到桌面”识别条件。
   - **How**：使用 Next.js App Router 的 manifest 路由导出 `MetadataRoute.Manifest`，start_url 指向首页（`/`）。

2. 新增图标生成文件（优先代码生成，避免引入二进制资源）
   - **What**：新增 `app/icon.tsx` 与 `app/apple-icon.tsx` 生成应用图标。
   - **Why**：补齐 Android/桌面安装与 iOS 主屏幕图标需求。
   - **How**：使用 `next/og` 的 `ImageResponse` 动态生成品牌色图标，保证无需额外图片资产即可落地。

3. 新增 `public/sw.js`
   - **What**：提供最小 service worker（install/activate/fetch 基础处理）。
   - **Why**：满足 Chromium 对可安装站点的关键条件之一，并为后续离线策略留扩展位。
   - **How**：采用最小安全实现（不缓存敏感接口响应，不记录隐私数据），先做轻量静态资源直通策略。

4. 新增全局注册组件并接入 `app/layout.tsx`
   - **What**：新增客户端组件（如 `app/components/pwa-install-provider.tsx`）负责注册 service worker、捕获 `beforeinstallprompt`、管理安装可用状态。
   - **Why**：服务于首页/结果页复用安装能力，避免每页重复实现。
   - **How**：在 layout 中挂载 provider；provider 仅在浏览器端运行，SSR 下安全降级。

### B. 安装引导交互（首页 + 结果页）
5. 新增安装引导状态与触发器（共享 Hook/Context）
   - **What**：在 provider 中暴露 `canInstall`、`install()`、`isStandalone`、`platformHint` 等状态。
   - **Why**：统一处理不同平台行为，页面只消费状态并渲染按钮/提示。
   - **How**：
   - Chromium：若捕获到 `beforeinstallprompt`，显示“添加到桌面”按钮并调用 `prompt()`。
   - iOS Safari：无原生事件时展示“分享 → 添加到主屏幕”引导弹层。
   - 已安装场景：展示“已添加到桌面”状态，避免重复打扰。

6. 更新 `app/page.tsx`（首页入口）
   - **What**：在主操作区新增次级 CTA（如“添加到桌面”）与轻量说明。
   - **Why**：覆盖新用户，提前建立留存路径。
   - **How**：遵循现有 amber + slate、弱边框风格，保持主按钮优先级不被抢占。

7. 更新 `app/result/page.tsx`（结果页入口）
   - **What**：在结果页头部动作区新增“添加到桌面”入口，完成评估后可见。
   - **Why**：命中高意图时刻（用户看到匹配结果后），提升安装转化。
   - **How**：与首页共用 provider 能力；在无安装能力时自动展示平台引导文案。

### C. 文案与可用性细节
8. 统一安装文案与失败兜底
   - **What**：补齐“安装中/已安装/当前浏览器不支持一键安装”的状态文案。
   - **Why**：减少用户误解，降低因平台差异导致的流失。
   - **How**：以中文短句 + 一步操作提示实现，避免技术术语。

## 4) Assumptions & Decisions
- 已确认：本次真实目标是“促进 PWA 安装留存”，而非真正保存报告文件。
- 已确认：本次不做浏览器通知订阅、不做 Web Push 链路。
- 已确认：入口放置在“首页 + 结果页”。
- 已确认：历史结果功能本次不做（后续单独迭代）。
- 技术决策：采用原生 H5 + Next App Router 能力，不引入 `next-pwa` 等额外依赖，降低改动面与维护成本。

## 5) Verification Steps
1. 运行静态检查
   - 执行 `npm run lint`，确保新增 TS/React 代码无语法与规范错误。

2. 本地启动并手动验证
   - 启动开发环境后访问首页与结果页，确认都能看到安装入口（或平台引导）。
   - Chromium 下验证：
     - 站点满足安装条件时出现“添加到桌面”可触发安装弹窗。
     - 安装后再次访问展示“已添加到桌面”状态。
   - iOS/Safari 语义验证：
     - 无 `beforeinstallprompt` 时出现“分享 → 添加到主屏幕”引导。

3. PWA 资产验证
   - 访问 `/manifest.webmanifest`（或 manifest 路由）检查字段完整性。
   - 在浏览器开发者工具确认 service worker 注册成功且无报错。

4. 回归验证
   - 回归首页“开始查询/先完善资料”与结果页“返回修改表单/重新评估”主流程不受影响。

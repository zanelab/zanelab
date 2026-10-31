# supabase-iam-login-page

## Goal

用云端 Supabase 实现 iam-web 中的 `LoginPage.tsx` 页面，**认证方式 = email + OTP**（GoTrue 两步流：发码 → 验码）。页面 UI 按用户设计提示词 1:1 落地（极简现代风），**OTP 验码步骤 = 独立验证弹窗**（第二份设计提示词 1:1 还原，遮罩+blur+rounded-3xl），daisyUI/Tailwind 消费基座样式；**颜色/圆角优先消费基座下发的 `preferences` props**。

## Background

- iam-web 是 qiankun 子应用（承载 portal 登录页，`config.js` `auth.loginPath: '/iam/login'`，`public: true` 免鉴权）。现 LoginPage 经 `props.http.post('/sys/auth/login')` 打 legacy 后端（base64 密码 + envelope 解包）。
- 云 Supabase 栈：认证走 **GoTrue**。M1 stash（`git stash@{0}^3`）已定 Edge Fn `iam` 契约：出参 `{ code:0, data:{ token, refreshToken, user:{ id, username, email } }, msg }` —— **envelope 形状与 legacy 登录对齐，前端消费零改动**。**但 M1 只有 password 登录路由（stash grep otp/verifyOtp 为空），OTP 路由是本任务新定契约**。
- legacy OTP 先例（历史 commit caa303a9 可查）：`POST /sys/auth/otp` 发码端点 → `{ code: 0, data: { success: true }, msg: 'ok' }`；登录体 `{ loginChanel, email, password, code }` 的 `code` 槽位即验证码。本任务沿用这两个形状定 Supabase OTP 契约。
- GoTrue 原生两步：`signInWithOtp({ email })` 发验证码邮件；`verifyOtp({ email, token: code, type: 'email' })` 返回 session（access_token/refresh_token）。
- 基座 props 下发 `preferences`（外观子集 getter，每次 mount 取最新值）——本页 UI 主题色/圆角以此优先。
- 本页 UI 现状：daisyUI card 双输入框（username/password），无设计感。

## Requirements

### R1 Supabase 认证接入（email + OTP 两步流）

- 登录请求切到 Supabase Edge Fn `/api/v1/auth/*`：
  - **步骤 1 发码**：`POST /api/v1/auth/otp/send`，body `{ email }` —— Edge Fn 封装 GoTrue `signInWithOtp({ email })`，向该邮箱发送验证码；出参 envelope `{ code: 0, data: { success: true }, msg }`（形状对齐 legacy `/sys/auth/otp` 先例）
  - **步骤 2 验码**：`POST /api/v1/auth/otp/verify`，body `{ email, code }` —— Edge Fn 封装 GoTrue `verifyOtp({ email, token: code, type: 'email' })`，GoTrue 返回 session；出参 `{ code:0, data:{ token, refreshToken, user:{ id, username, email } }, msg }`（data 形状沿用 M1 契约，与 legacy 登录出参对齐）
  - **无密码**：本页只有邮箱输入 + 验证码输入，**废除 base64 `btoa`**（无密码可编码；legacy 端点才需要）。两路由契约中文注释注明「M1 无 OTP 路由，本任务新定；形状沿用 M1 出参 + legacy OTP 发码先例」
  - Envelope 解包沿用（`{ code, data, msg }`，code 0 成功）——经 `props.http` 共享实例（拦截器/401 处理一致；iam 无自建 axios）
  - 发码防抖：60s 倒计时 cooldown（前端本地计时），倒计时内「获取验证码」按钮 disabled + 文案「{n}s 后可重发」
- 成功后 `props.onLoginSuccess({ token, refreshToken, user })` 回传宿主不变（宿主 bootstrapSession 逻辑零改动）。
- Edge Fn URL 可配：`VITE_IAM_API_TARGET`（dev vite proxy `/iam/api` → target，剥前缀）——**M1 stash 已有 `<APP>_API_TARGET` 通配代理约定**，本任务落地 iam 一项；云项目 ref 未提供时代理 target 留空（`.env.development` 注释占位），UI/逻辑先行，**curl 云验证列 AC 但可 blocked**（不静默降级，记录阻塞点）。
- Google/GitHub 按钮：**UI 先行**，disabled + tooltip「即将开放」（GoTrue OAuth 需云控制台配置 provider，本任务不接 OAuth 流，后续任务接）。

### R2 基座 preferences 消费

- `PltProps` 增 `preferences?: SubAppPreferences 形状`（iam-web 内本地类型，不 import 宿主模块——跨应用契约按形状对齐，注释注明与宿主 `SubAppPreferences` 一致）。
- 消费优先级：**props.preferences 存在 → 主题色 colorPrimary / 圆角 radius / 字号 fontSize 用它**；缺省 → 本页内置中性缺省（mode 缺省 light）。
- 应用方式：页面根 div 内联 CSS 变量（`--page-primary` 等）+ Tailwind 任意值类消费，**不改宿主 daisyUI 主题**（沙箱隔离，只影响本页）；暗色 mode='dark' 时页面自身切暗（本页自持 `data-theme` 派生，等宿主推送时随 props getter 更新）。

### R3 UI 重设计（设计提示词 1:1 落地）

整体：纯白背景、垂直居中容器 `max-w-md` 水平居中、无衬线字体、充足留白、干净呼吸感。从上到下：

1. **顶部导航（左上角）**：返回链接「返回 svg 图标 + 返回首页」，小字号，浅灰/深灰，无下划线。
2. **主体卡片（垂直居中）**：Logo 顶部居中；标题「登录」大号深色字重适中；副标题「请登录您的账号继续」居中小字灰色。
3. **社交登录按钮区**：Google 按钮（全宽、主题色背景、白字「使用 Google 登录」、彩色 G 图标、`rounded-full`）；GitHub 按钮（全宽、浅灰蓝背景、深色文字、黑色 GitHub Logo、`rounded-full`）；两按钮适当垂直间距。**R1 定：disabled + 「即将开放」提示**。
4. **分割线**：含「或」文字的水平分割线，浅灰细线。
5. **邮箱输入区（OTP 步骤 1：发码）**：
   - 邮箱输入框（placeholder `name@example.com`，浅灰背景、极浅边框、全圆角、舒适内边距）+ 全宽「获取验证码」按钮（主题色背景、白字、`rounded-full`）
   - **无密码框**：原 R3 提示词的密码输入补齐点因 OTP 认证取消——email + 验证码替代 email + password
   - 发码成功 → **弹出 R3b 验证弹窗**（验码步骤在弹窗内完成，登录页不内联展开码输入）
6. **状态**：hover 颜色微微加深、输入框 focus ring 效果、loading spinner（发码/验码各自独立）、错误提示区。
- daisyUI 组件优先（btn/input/divider 等类），精简代码；品牌 SVG（Google 多色 G / GitHub 黑 Logo / 返回箭头）内联（与 portal `forms/icons/brand.tsx` 同款 path，iam-web 内联不跨应用 import）。

### R3b OTP 验证弹窗（第二份设计提示词 1:1 还原）

发码成功后弹出的模态弹窗，验码 + 验证 + 重发都在弹窗内完成：

- **遮罩**：深色半透明 + `backdrop-blur`（背景虚化），点击遮罩可关闭弹窗（回到登录页邮箱步骤）。
- **弹窗容器**：白色背景、水平居中、`rounded-3xl` 大圆角、`shadow-xl` 柔和阴影、宽约 480px（`max-w-[480px]`）、内边距大（p-8 ~ p-10）。
- 内部从上到下：
  1. **右上角关闭图标**：灰色 X icon（daisyUI `btn btn-ghost btn-circle btn-sm` 或同款），点击关闭弹窗。
  2. **顶部图标**：正中间圆形浅灰背景（`bg-gray-100` 圆形）内含深灰色信封图标（Mail icon，内联 SVG）。
  3. **标题与副标题**：标题「查看你的电子邮件」（`text-3xl` `font-semibold` 深灰/近黑，居中）；副标题「我们已向 xxx@xxx.xxx发送了验证码」（小字灰色居中，**邮箱部分加粗**——邮箱取步骤 1 输入值动态渲染）。
  4. **OTP 输入框区域**：6 个独立方形输入框水平排列（有间距），样式 border + `rounded-lg`、高约 48px（`h-12`）；**数字键入自动跳格**（输入一位焦点移到下格，退格回上格，粘贴 6 位自动分发）；激活态边框变深变粗 + 闪烁竖线光标（focus ring/光标效果）；下方提示文字「输入您电子邮件中的6位数字代码」（小字灰色居中）。
  5. **验证按钮**：全宽 `w-full` `rounded-xl`；6 位未输满时 disabled（浅灰底 `bg-slate-400` 左右、白字「验证」——提示词文案「验证码」疑为笔误，实现取「验证」，注释说明）；输满后启用（主题色背景，hover 微加深）。
  6. **重新发送链接**：居中「未收到验证码？重新发送验证码」——灰色文字，链接部分下划线；点击触发重发（复用 `otp/send`），**60s 倒计时期间禁用**（文案「{n}s 后可重发」），与登录页发码防抖共享同一倒计时状态。
  7. **底部提示框（Info Box）**：`bg-gray-50` 圆角矩形 + 细边框，左侧带圈 "i" 提示图标（内联 SVG），两行文字：「遇到问题了吗？」（深色加粗）/「请检查您的垃圾邮件文件夹，或尝试重新申请一个验证码。」（浅灰色小字）。
- **preferences 消费同 R2**：弹窗主题色/圆角同样优先取 props.preferences（colorPrimary 用于验证按钮启用态、重发链接强调等）；弹窗自持 `data-theme` 派生与 R2 一致。
- 验码成功 → envelope 解包 → `onLoginSuccess` 回传宿主 + 关闭弹窗；验码失败 → 弹窗内错误提示区（不打断输入）。

### R4 返回首页链接

- 「返回首页」跳 portal homePath（`/home`）——子应用内 `window.history.pushState` + popstate 交还宿主路由（与 portal redirectToLogin 对称），**不用子应用 router 导航**（basename 外路径）。

## Acceptance Criteria

- [ ] LoginPage 重设计落地，R3 设计点逐项可对照（居中布局/留白/按钮/分割线/输入区/hover+focus 状态）
- [ ] OTP 验证弹窗落地，R3b 设计点逐项可对照（遮罩 blur/rounded-3xl 容器/信封图标/邮箱加粗副标题/6 格输入自动跳格/禁用态验证按钮/重发链接/Info Box）
- [ ] 认证切 Supabase Edge Fn email+OTP 两步流：`otp/send` `{ email }` → 弹窗内 `otp/verify` `{ email, code }` → envelope 解包 → `onLoginSuccess` 回传（token/refreshToken/user），base64 废除、无密码框
- [ ] 发码防抖：60s 倒计时内重发链接/按钮 disabled + 文案「{n}s 后可重发」，登录页与弹窗共享倒计时，结束恢复
- [ ] OTP 6 格输入：自动跳格/退格回退/粘贴分发，未输满验证按钮 disabled
- [ ] preferences 消费：mock props.preferences（colorPrimary/radius/mode）注入时页面主题色/圆角/暗色随 props；缺省时中性缺省正常渲染
- [ ] PltProps 增 preferences 类型 + 本地 SubAppPreferences 形状类型（注释注明与宿主契约一致）
- [ ] Google/GitHub 按钮 disabled + tooltip（OAuth 后续任务）
- [ ] 返回首页链接经 pushState/popstate 交还宿主
- [ ] vite proxy `/iam/api` → `VITE_IAM_API_TARGET` 落地（target 留空占位 + 注释）；云 curl 验证 AC 列出、ref 未给时记录 blocked 不静默
- [ ] iam-web `tsc` / `build` 全绿；portal `tsc`/`vitest` 基线守恒（本任务不涉及 portal 行为变更）
- [ ] 中文注释：OTP 两步契约（M1 无 OTP 路由、本任务新定 + 形状沿用 M1 出参/legacy 发码先例）、preferences 消费优先级、OTP 设计说明（无密码框 + 验码在弹窗完成 + 验证按钮文案笔误说明）
- [ ] 不碰用户本地文件（iam-web/vite.config.ts、portal public/config.js、global-search.tsx、package.json）

## Notes

- 云 Supabase project ref 未提供：Edge Fn 部署与 curl 验证 blocked（记录，不静默）；UI/逻辑/测试先行
- **OTP 两路由（otp/send / otp/verify）是本任务新定契约**——M1 stash 只有 password 登录（grep 验证为空）；Edge Fn 侧实现随 M1 恢复任务落地，本任务前端先行
- GoTrue OAuth（Google/GitHub provider）后续任务接，本任务 UI disabled 占位
- portal 侧零改动（props http/onLoginSuccess/preferences 契约均已就绪）

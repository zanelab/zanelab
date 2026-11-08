# portal-web 宿主菜单/会话端点切 iam（新契约映射 + logout）

## Goal

宿主的三个运行时端点从旧后端切到 iam Edge Fn，完成「登录走 iam」之后的**会话与菜单数据源闭环**：

- `menusEndpoint` → iam `GET /auth/menus`（匿名游客子集 / 登录按权限 / admin 全量）
- `refreshEndpoint` → iam `POST /auth/refresh`（GoTrue 会话轮换——宿主会话即 GoTrue 会话，语义一致）
- `logoutEndpoint` → iam `POST /auth/logout`（**需补端点**，GoTrue signOut）

核心工程点：宿主 `transformMenu` 消费的旧 `RawMenuItem` 契约（`parent`/`menuType`/`scopes['O']`）
与 iam 新契约（无 `parent`/`menuType`、`scopes` A/C、`code` 为自动码 `m_<id>`、新增
`active_icon`、button 无 `uri`）已脱钩——需要一层映射。

用户价值：宿主菜单/会话数据源与登录体系统一到 iam+Supabase，旧后端不再出现在新链路。

## Background / Confirmed facts

- **F1 · 401 根因（已确诊）**：用户手改 `config.js` 把 `menusEndpoint` 指向
  `/iam/functions/v1/iam/menus`——该路径是 Edge Fn 的 **POST /menus（管理员写端点）**，
  而匿名读端点是 **GET /auth/menus**。`loadPublicMenus` 登录前请求 → 命中 `/menus` 分派 →
  `menusCreate` → `requireAdmin` → 无 token 1010/401。
- **F2 · transformMenu 实际消费的 RawMenuItem 字段**（逐行核验）：`id`/`name`/`type`/
  `uri`/`component`/`icon`/`children` + button 分支的 `code`（`permission: raw.uri || raw.code`）。
  **不消费** `parent`/`menuType`/`scopes`（类型里有、函数不用）。→ 映射层只需覆盖真正
  消费的字段，不背旧字段包袱。
- **F3 · 新契约字段**（Edge Fn `menusList` 的 `toTree` 产物 / iam `MenuItemRecord`）：
  `id`/`pid`/`code`(m_<id>)/`name`/`component`/`uri`/`type`/`sort`/`icon`/`active_icon`/
  `hidden`/`scopes`(A/C)/`children`。**button 节点 `uri` 恒 null**（11-04 动态表单 button
  类型 uri 矩阵 = hidden）——权限码 = `code`（自动码即权限码，用户已确认「全部自动码」）。
- **F4 · app 节点的 appName 表达（核心设计缺口）**：宿主 `transformMenu` 的 app 分支
  `appName = raw.component || raw.uri || raw.name`、`path = /{appName}`——appName 必须精确
  等于 `config.microApps` 的键（home/iam）才能路由子应用。11-04 表单把 app 的
  `component` 标为「应用名称（例 home）」、`uri` 标为「应用路由（例 /menu/index）必填」。
  iam mock 种子 app 节点 `component='iam'`、`uri='/iam'`。→ 需固化「component = 注册键」
  的约定（Q1）。
- **F5 · 宿主会话 = GoTrue 会话**：登录走 iam OTP，iam 经 `props.onLoginSuccess` 把
  `token`(GoTrue access)/`refreshToken`(GoTrue refresh) 交还宿主 `bootstrapSession`。
  故 refreshEndpoint 切 iam `POST /auth/refresh` 语义闭环；logout 同理（GoTrue signOut）。
- **F6 · 数据现状**：迁移 0001 的 `menus` 表**无种子数据**（只有 roles/role_permissions），
  菜单数据靠 mock；portal mock 的 `mockRawMenus` 是旧契约（`parent`/`menuType`/`scopes['O']`），
  需同步新契约。
- **F7 · logout 端点缺失**：iam Edge Fn 无 logout；宿主 `authApi.logout` 已 POST
  `logoutEndpoint` + Bearer token。需补 `POST /auth/logout`（GoTrue HTTP
  `POST {url}/auth/v1/logout`，Authorization Bearer access_token）。

## Requirements

- **R1 · transformMenu 契约适配**（`apps/portal-web/src/api/menu.ts`）：
  `RawMenuItem` 类型改新契约（删 `parent`/`menuType`、`scopes` A/C、`code` 语义注释、
  加 `active_icon`）；button 分支 `permission = raw.code`（自动码即权限码，不再 `uri || code`
  ——uri 恒 null）；app 分支按 Q1 结论调整（appName 来源 + path 用 uri）。
- **R2 · iam Edge Fn 补 logout**：`POST /auth/logout`（匿名可调——凭 Bearer access_token
  调 GoTrue signOut；失败不致命，宿主角落是清本地会话）。
- **R3 · config.js 切换**：`menusEndpoint='/iam/functions/v1/iam/auth/menus'`、
  `refreshEndpoint='/iam/functions/v1/iam/auth/refresh'`、
  `logoutEndpoint='/iam/functions/v1/iam/auth/logout'`（保留 apiKey——已填 publishable）。
- **R4 · portal mock 新契约**：`mocks/handlers.ts` 的 `mockRawMenus` 改新字段；对应
  transformMenu 的测试 fixture 同步。
- **R5 · iam mock 对齐**：`menu-handlers.ts` 的种子 app 节点 component/uri 按 Q1 约定。
- **R6 · 测试**：transformMenu 新契约用例（app 路由、button 权限码=code、菜单 uri 拼接）；
  宿主 fetchMenus 端到端（MSW 下 mock 新契约 → MenuItem 树正确）。

## Acceptance Criteria

- **AC1** 未登录（无 token）：`fetchMenus` 返回游客可见菜单（iam 匿名子集），**不再 401**；
  壳渲染侧边栏公开菜单。
- **AC2** 登录（GoTrue token）：`fetchMenus` 返回按权限菜单；admin 全量。
- **AC3** button 节点 `permission` = 自动码 `m_<id>`，宿主 `flattenPermissions` 能提取
  （登录用户权限集含该码时按钮可见）。
- **AC4** app 节点正确路由到子应用（`appName` 命中 `microApps` 键，`/iam` 菜单能挂 iam 容器）。
- **AC5** logout 走 iam 端点：登出请求 POST `/iam/functions/v1/iam/auth/logout`，宿主清
  本地会话（GoTrue 侧 signOut 失败不阻断）。
- **AC6** vitest 覆盖 R6；两 app build/tsc/prettier 绿；spec/README 一致。

## Out of scope

- 宿主菜单的**数据回填**（menus 表空，需先用菜单管理页录入真实数据）。
- 旧后端彻底移除（其它端点/清理另任务）。
- 宿主登录页/改密的恢复（已注释，本任务不动）。

## Open questions (blocking)

- **Q1 · app 的 component 约定**：新契约里 app 节点的 `component` 是否**约定为子应用注册键**
  （home/iam，与 `config.microApps` 键一致）？`uri` 是否作为 app 的默认落点路径
  （`/iam`、`/home`）？（见下方提问）

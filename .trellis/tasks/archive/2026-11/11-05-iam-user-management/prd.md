# iam-web: 用户管理页面（全栈：用户列表 + 角色分配）

## Goal

在 iam-web 实现用户管理页面（`/iam/users`，菜单树已预留该路由与 `system:user:list`
权限码）：用户列表（分页）+ 每用户角色查看/分配 + **禁用/启用用户**。数据源 =
Supabase `auth.users`（经 Edge Fn service role 查询）+ 11-03 已建的 `user_roles`/
`roles` 表。api 层、mock、测试全部沿用菜单管理确立的形态（第二域，模式复用成本极低）。

用户价值：管理员能看到已注册用户、把「游客」提升为「管理员」（RBAC 的写侧闭环——
11-03 只建了数据底座和注册触发器，角色分配至今只能进数据库手工改）；**禁止违规
账号登录**（禁用语义）。

## Background / Confirmed facts

- **F1 · RBAC 底座现成**：`roles`（admin/guest 种子）、`user_roles`（user_id↔role）、
  `role_permissions`（admin 持 `*` 通配 + `system:menu:*` 四码）；注册触发器（首个用户
  admin）。**无需新迁移**——用户确认权限可见性按菜单 code + `*` 通配判断，
  `system:user:*` 码不加。
- **F2 · 页面占位现状**：`App.tsx` 的 `users` 路由落 `SystemPage` 占位卡片。
- **F3 · 权限码消费链已通**：Edge Fn 的 `userPermissions()` 从 `role_permissions` 取
  用户权限集，`menusList` 对 button 节点按 `uri`（权限码）过滤——管理页可见性由宿主
  菜单树控制（button 节点 `system:user:list`），**页面内不再重复鉴权**（与菜单管理同口径）。
  但**写端点（角色分配）必须 admin-only**（与菜单 CRUD 同款 `requireAdmin`）。
- **F4 · ctx.supabase 的 client 作用域待验证（本任务最大技术不确定点）**：
  `withSupabase({ auth: ['publishable', 'secret'] })` 的 ctx.supabase 用哪种 key 创建。
  现有端点全是对 `public.menus` 的操作（RLS 未启，anon 也能写），无法反推。
  **列 `auth.users` 必须 service role**（auth schema 对 publishable 不可见）。实施时
  首先验证：若 ctx.supabase 非 service role，需从 `withSupabase` 的 ctx 里取 secret
  client 或自建（`createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)`，Deno env 有）。
- **F5 · 形态先例全有**：api 层（`menusApi` 命名空间对象 + endpoints 常量）、mock
  （内存数据 + Authorization 身份）、页面（树形/表格 + 弹窗 + toast 上抛）、测试栈、
  类型联动校验矩阵的写法——用户管理是同构复制 + 角色分配特化。
- **F6 · 页面不需要动态类型联动**（那是菜单的资源类型语义）；用户管理是**平表 + 行内
  角色编辑**，比菜单管理简单。
- **F7 · 本机无 supabase CLI**：迁移静态自查 + mock 路线全验，本地栈验证留用户
  （同 11-03/11-04 约束）。

## Requirements

- **R1 · 无迁移**（用户确认）：admin 权限集已有 `*` 通配，权限可见性按菜单 code
  判断即可——`system:user:*` 种子不加（YAGNI，将来引入细分角色时再补）。
- **R2 · Edge Fn**：`GET /auth/users`（admin-only；service role 列
  `auth.users` id/email/created_at/last_sign_in_at/banned_until + join
  `user_roles`/`roles` 聚合角色列表）+ `PUT /users/:id/roles`（admin-only；全量替换
  该用户的角色绑定）+ `PUT /users/:id/ban`（admin-only；body `{ disabled: boolean }`，
  经 `auth.admin.updateUserById` 置 `banned_until`——永久禁用用远未来时间戳，恢复传 null）。
  错误码沿用（1010/1011/1013），新增按需。
  **自禁保护**：禁用请求的目标是自己 → 1015（管理员不能禁用自己）。
- **R3 · api 层**：`usersApi = { list, assignRoles }` + endpoints 常量
  （第三域，形态同 menus）。
- **R4 · 页面**：`UserManagementPage`——用户表格（邮箱/角色 badge/状态 badge
  （正常/已禁用）/注册时间/最近登录/操作列）+ 角色编辑弹窗（admin/guest toggle，
  guest 不可摘除？——design 定：至少保留一角色）+ **禁用/启用按钮**（自禁置灰）
  + 403 只读（同菜单页）。**不需要**：新建/删除用户（注册走 OTP 自助）。
- **R5 · mock**：`user-handlers.ts`（内存用户表 + Authorization 身份判定）。
- **R6 · 测试**：api 用例 + 页面用例（列表渲染/角色分配/游客 403）。
- **R7 · 文档**：README 契约表、spec 增补（第二业务域沉淀同菜单）。**无迁移文件**——
  本任务不触碰数据库 schema 与种子。

## Acceptance Criteria

- **AC1** `/iam/users` 渲染用户列表（不再是占位卡片）；列表含 email、角色、状态、注册时间。
- **AC2** 角色分配：admin 弹窗改角色 → `PUT` 落库 → 列表刷新；分配 admin 后该用户可见
  权限集变化（`menusList` 行为随动）。
- **AC2b** 禁用：admin 点禁用 → 该用户 `banned_until` 置位 → 列表状态变「已禁用」；
  被禁用户下次登录（OTP verify）被 GoTrue 拒绝；**不能禁用自己**（1015）。
- **AC3** mock 双态可演示；游客写操作 403。
- **AC4** 本地栈验证（用户手测）：admin 能列出注册用户并分配角色/禁用。
- **AC5** vitest 覆盖 R6；两 app build/tsc/prettier 绿；AC6 spec/README 一致。

## Out of scope

- 新建/删除用户（注册走 OTP 自助）。
- 密码重置、邮箱变更。
- 菜单管理页的任何改动。
- 禁用的时效期选择（本任务只有「永久禁用/恢复」二元态；限时效禁用另任务）。

## Open questions (blocking)

- **Q1 · ctx.supabase 作用域**（F4）：实施时验证；若需自建 service client，env 变量
  `SUPABASE_SERVICE_ROLE_KEY` 在 Deno deploy 的注入方式需一并确认。

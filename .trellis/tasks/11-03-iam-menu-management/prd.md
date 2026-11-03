# iam-web: 菜单管理页面（全栈：页面 + Edge Fn + 建表）

## Goal

iam-web 目前在 `/iam/menus` 只有一个占位卡片。本任务把它变成真实的菜单管理页面：树形列表 + 新增/编辑/删除，接口收敛在 `src/api/` 层，后端在 Supabase Edge Fn `iam` 上新增菜单端点，数据落 Supabase 表（含迁移文件）；MSW mock 使双态无需云也可联调。

本任务同时落地 **RBAC 的初始化语义**（Q2 已定）：默认第一个注册用户为**系统管理员**、其余注册用户为**游客**；菜单端点按请求者身份返回数据——未登录返回游客可见菜单，登录用户按其权限返回。这会牵出**角色管理的数据底座**（角色表 + 用户-角色关联 + 初始化逻辑），角色管理**页面**本身不在本任务范围。

这是 iam 子应用的**第一个真实业务域**。它确立的模式（api 层第二域、Edge Fn 第二组端点、首个迁移文件、RBAC 数据底座、iam-web 测试栈）是后续用户/角色管理页的地基。

## Background / Confirmed facts

- **F1 · 占位现状**：`apps/iam-web/src/App.tsx` 的 `SystemPage` 是纯展示卡片；无 `menus` 显式路由
  （落 `*` 兜底）。
- **F2 · 菜单契约有两份参考**：旧后端 `RawMenuItem`（13 字段树形，`apps/portal-web/src/api/menu.ts:8-25`）
  与宿主展示用 `MenuItem`。宿主 `fetchMenus` 拉的是 `RawMenuItem` 形状（经 `transformMenu` 转展示树）
  ——**新表必须承载 `RawMenuItem` 语义**，否则宿主菜单树与 iam 管理页各说各话。
- **F3 · 权限码已预留**：mock 数据里 `/iam/menus` 挂 `system:menu:list`；宿主
  `menu-store.ts` 的 `flattenPermissions` 从菜单树递归提取权限码注入 `props.permissions`
  （`register.ts:164-166` getter）——子应用集成态天然拿得到权限码数组。
- **F4 · Edge Fn 现状**：仅两个匿名 OTP 端点；`withSupabase({ auth: [...] })` 包装、
  `json()/error()` envelope、i18n 文案表是现成模式；**无数据库表、无 migrations 目录**。
- **F5 · 鉴权语义（Q2 已定，超出「仅 JWT」的原始选项）**：
  - 未登录 → 返回**游客能查看的菜单**（不是 401 拒绝）；
  - 注册用户默认角色 = **游客**；第一个注册用户 = **系统管理员**；
  - 登录用户按其**权限**获取可查看菜单；
  - 需要**角色表 + 用户-角色关联 + 初始化逻辑**（注册钩子/首次访问种子），角色管理**页面**不在本任务。
- **F6 · 集成态身份通道**：子应用拿到的是宿主 `props.token`（Supabase JWT）；Edge Fn 侧用
  `withSupabase` 的 ctx 可从 JWT 解出 user。**游客/管理员判定在服务端**（JWT → user → 角色查询），
  不信前端传的任何角色字段。
- **F7 · api 层与 mock 基建现成**：`endpoints.ts` 零依赖常量 + 域命名空间对象（10-31 确立）；
  mock handler 路径从常量派生（`pagePaths` 模式）。
- **F8 · 测试栈（Q3 已定：引入）**：vitest + jsdom + @testing-library（照 portal 模式
  `apps/portal-web/package.json` devDeps + `vitest.config`），覆盖 api 归一化、树操作、页面核心交互。
- **F9 · 部署**：本地 `supabase start` 可全验（AI 可跑）；云上部署是用户手动步骤。

## Requirements

- **R1 · 数据底座（RBAC 初始化）**
  - 迁移文件建表：`menus`（承载 F2 语义）、`roles`（含内置 `guest` / `admin`）、
    `user_roles`（user_id ↔ role 关联）、`role_permissions`（角色 → 权限码集合）；
  - **首个注册用户自动成为 `admin`，其余注册用户默认 `guest`**——用 Supabase 触发器
    （`auth.users` INSERT hook）或 Edge Fn 注册后置逻辑实现，design 定夺；
  - `guest` / `admin` 的权限码种子数据随迁移写入。
- **R2 · Edge Fn 菜单端点**
  - `GET /auth/menus`（或独立前缀，design 定）：未登录（无/无效 JWT）→ 游客可见菜单；
    登录 → 按用户角色权限返回；`POST /menus`（create）、`PUT /menus/:id`（update）、
    `DELETE /menus/:id`（delete）——**仅 admin 可写**（Q2 结论的推论），游客只读；
  - 鉴权失败/越权的错误码与文案进既有 `error()`/i18n 表；响应沿用 envelope 模式。
- **R3 · 前端 api 层**：`src/api/menus.ts`（list/create/update/delete）+ `endpoints.ts` 常量，
  形态沿用 F7。
- **R4 · 菜单管理页**：`src/pages/MenuManagementPage.tsx`——树形列表（展开/收起）+ 新增/编辑表单
  （name、code、uri、type、sort、icon、hidden）+ 删除（子树存在时阻止或级联，design 定夺）；
  替换 `App.tsx` 占位路由；daisyUI 组件（写前查组件指南）。
- **R5 · MSW mock**：`src/mocks/menu-handlers.ts`，路径从 `endpoints.ts` 派生（F7 模式），
  内存数据模拟「游客只读 / admin 可写」两种身份的响应差异。
- **R6 · 测试栈（F8）**：iam-web 引入 vitest + jsdom + @testing-library（照 portal 模式）；
  覆盖：api 归一化、树操作纯函数、MenuManagementPage 核心交互（渲染树/新增/删除）、
  未登录（游客数据）分支。
- **R7 · 文档与 spec**：README（CRUD curl 示例、本地栈步骤）、Edge Fn 契约注释、spec 增补
  「子应用首个业务域 + RBAC 初始化」约定。

## Acceptance Criteria

- **AC1** 访问 `/iam/menus`（集成态/独立态）渲染菜单管理页，不再是占位卡片。
- **AC2** 树形列表渲染返回数据；新增/编辑/删除后列表刷新且与后端一致。
- **AC3** 独立态 + `VITE_USE_MOCK=true`：CRUD 全链路被 MSW 拦截，双身份（游客只读/管理员可写）
  行为可演示。
- **AC4** 本地 Supabase 栈（`supabase start` + `db reset`）：注册第一个用户 → 数据库中该用户为
  `admin`；再注册第二个 → 为 `guest`；管理员建/改/删菜单落表、重启不丢；游客写入被拒。
- **AC5** 未登录 `GET` 菜单端点 → 游客可见子集（非 401、非全量）；admin 登录 `GET` → 全量。
- **AC6** `grep -rn "functions/v1" apps/iam-web/src` 命中仅 `src/api/` 与 `src/mocks/`。
- **AC7** vitest 覆盖 R6 所列分支且全绿；两 app build/lint 全绿；spec/README 与实现一致。

## Out of scope

- 角色管理**页面**（本任务只建 RBAC 数据底座 + 初始化；页面另任务）。
- 用户管理页；宿主侧（portal-web）任何改动；云上部署本身。
- 菜单拖拽排序（sort 数字编辑即可）。
- 细粒度到「按钮级权限的前端隐藏/禁用」重构——页面内权限控制沿用现状（props.permissions 已通）。

## Open questions (blocking)

（无——Q2 鉴权语义、Q3 测试栈均已定）

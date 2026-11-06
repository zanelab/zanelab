# iam-web: 角色管理页面（角色列表 + 菜单树授权）

## Goal

在 iam-web 实现角色管理页面（`/iam/roles`，菜单树已预留路由）——**RBAC 的授权界面**：

- 左右两栏：左侧（约 2/3）角色 Table + Pagination；右侧（约 1/3）菜单树
  Checkbox 勾选，底部「还原 / 保存」按钮。
- 保存 = 把勾选菜单的 `code` 写入 `role_permissions`（全量替换该角色的授权）；还原 =
  回到进入页面时拉取的旧 code 集合。

顺带完成权限模型的**闭环修正**：登录用户的菜单可见性从「仅 button 按权限码过滤」扩展为
「**全类型按 role_permissions 的 code 集合过滤**」——否则角色勾选 menu/group/app 节点无效果
（当前 `menusList` 只对 button 查 `permSet.has(row.code)`）。

用户价值：管理员能给任意角色勾选菜单授权（不再是「admin 全量 / guest 空」的两极），
RBAC 的授权写侧从进数据库手改变为界面操作。

## Background / Confirmed facts

- **F1 · code 的语义（用户澄清）**：`menus` 的 `code`（自动码 `m_<id>`）= **权限码**，是角色
  授权的 key。角色管理界面勾选菜单树 → 保存时把勾选菜单的 `code` 写入 `role_permissions`。
  自动码不可读无碍——用户在树上看的是菜单名，code 只是绑定的凭证。
- **F2 · 权限过滤缺口（连带修正）**：当前 `menusList` 登录分支只对 button 做权限判定
  （`permRequired = row.type === 'button'`；`allowed = !hidden && (!permRequired || permSet.has(row.code))`）。
  即 menu/group/app 只要 `hidden=false` 就对所有登录用户可见。角色授权全类型菜单后，
  这套判定要让「角色被授权的 code 集合」覆盖所有节点，否则勾选 menu 节点无效果。
- **F3 · RBAC 表**：`roles(id/code/name)`、`user_roles(user_id, role_id)`、
  `role_permissions(role_id, permission)`——`permission` 即菜单 `code`（或 `*` 通配）。
  种子：admin 持 `*`；guest 无码（只靠 `scopes 含 C` 的游客规则看公开子集）。
- **F4 · 无角色端点**：Edge Fn 目前只有菜单/用户/会话端点，**无 roles/role_permissions 的
  读写端点**——角色管理页需补：`GET /roles`（角色列表）、`GET /roles/:id/permissions`
  （角色已授权 code 集合）、`PUT /roles/:id/permissions`（全量替换授权）。
- **F5 · 可见性规则并存**：游客（匿名）规则 = `hidden=false + scopes 含 C`（客户端可见），
  与登录用户的「按授权 code 过滤」是**两套**——admin 的 `*` 通配全量。需明确登录用户
  与游客规则的关系（Q1）。
- **F6 · 前端形态先例全有**：api 层、mock、页面（表格/树）、测试栈——角色页是第四业务域，
  树形 checkbox 是菜单页树形表格的变体。iam mock 的 `menu-handlers` 已有树形种子可复用
  为授权树的菜单源。
- **F7 · 本机无 supabase CLI**：迁移/云部署验证留用户；mock 路线全验。

## Requirements

- **R1 · Edge Fn 角色端点**：`GET /auth/roles`（admin-only，角色列表）、
  `GET /auth/roles/:id/permissions`（该角色已授权 code 集合）、
  `PUT /auth/roles/:id/permissions`（admin-only，body `{ permissions: string[] }` 全量替换，
  值域校验 = menus 表存在的 code 或 `*`）。
- **R2 · 登录菜单可见性闭环**：`menusList` 登录分支改为「按角色授权的 code 集合过滤全类型
  节点」（含祖先链保持树完整）；admin `*` 通配全量；匿名仍走游客规则。具体规则见 Q1 结论。
- **R3 · 页面**：`RoleManagementPage`——左栏角色 Table（名称/编码/授权菜单数）+ Pagination；
  右栏菜单树 Checkbox（三态：全选/半选/未选，父节点勾选联动子节点）+ 底部「还原/保存」。
  还原 = 回到进入页面时的 code 集合；保存 = `PUT /roles/:id/permissions`。403 只读后置。
- **R4 · api 层**：`rolesApi = { list, getPermissions, savePermissions }` + endpoints 常量。
- **R5 · mock**：`role-handlers.ts`（内存角色 + 授权集合；Authorization 身份判定）。
- **R6 · 测试**：api 用例（列表/授权替换/值域校验）+ 页面用例（树勾选联动/保存/还原/游客 403）
  + menusList 全类型过滤的 Edge Fn 语义（镜像到 mock 可测）。
- **R7 · 文档**：README 角色契约节；spec 增补「code = 权限码、角色授权全类型菜单」约定。

## Acceptance Criteria

- **AC1** `/iam/roles` 渲染角色管理页：左角色表 + 右菜单树 checkbox，选中角色时树回显其授权。
- **AC2** 勾选/取消菜单树节点，父节点三态联动；保存 → `PUT /roles/:id/permissions` 落库；
  还原 → 树回到初始 code 集合（不发请求）。
- **AC3** 登录用户菜单可见性：角色被授权哪些菜单 code，就看到哪些（menu/group/app 均生效）；
  匿名仍按 scopes 含 C 看公开子集；admin `*` 全量。
- **AC4** 保存的 permissions 值域校验：非 menus code 且非 `*` → 400。
- **AC5** mock 双态可演示；游客写操作 403。
- **AC6** vitest 覆盖 R6；两 app build/tsc/prettier 绿；spec/README 一致。

## Out of scope

- 新增/删除角色（roles 表 CRUD——本任务只授权现有角色；新建角色另任务）。
- 用户-角色分配界面的改动（用户管理页已有 assignRoles，不动）。
- 权限码语义化重构（code 保持自动码；「权限码别名」字段另任务，见 Q1 无关）。

## Key decisions (resolved)

- **Q1 · 登录可见性 = 纯授权**（用户确认）：
  - 登录用户（任意角色）只看角色被授权的 `code` 集合（**所有类型**，含祖先链保持树完整）。
  - admin 持 `*` → 全量。
  - 匿名（未登录）走 `scopes 含 C` 公开子集（不变）。
  - 代价（已接受）：注册默认的 `guest` 角色无授权 → 登录后空菜单；管理员在角色页给 guest
    勾选公开菜单即可。将来可做「新角色默认授权公开菜单」的初始逻辑（另任务，不在本范围）。

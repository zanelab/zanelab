# iam-web: RBAC 权限体系重构（语义权限码 + 权限树授权 + 接口鉴权）

## Goal

回归行业标准 RBAC（NIST RBAC + 若依/RuoYi 模式），把「菜单导航、按钮操作、接口鉴权」三层统一到**同一套语义权限码**上：

1. **恢复语义权限码** `模块:资源:操作`（`system:menu:list`、`system:user:add`）——11-04 的
   「全部自动码 m_<id>」是倒退，丢掉了权限码作为「接口鉴权锚点」的能力。
2. **菜单表加 `permission` 字段**（若依的 `perms`）：目录/菜单节点挂「进入权限」
   （`system:user:list`），按钮节点挂「操作权限」（`system:user:add`）。
3. **角色授权界面 = 权限树**：目录 → 菜单 → 按钮三级树勾选，存节点的 `permission` 进
   `role_permissions`——菜单授权与操作授权天然同源，不维护第二套常量。
4. **后端 `requirePermission(perm)`**：接口校验权限码而非角色；`requireAdmin` 退役，admin
   只是「默认持有全部权限码」。
5. **前端 `Permission` 组件**：按钮按权限码显隐，与接口鉴权同源。

用户价值：权限精确到「能建菜单但不能删菜单」的操作级，且前端按钮、后端接口、菜单导航三处
用同一个权限码，不会再出现「前端隐藏了、接口却能裸调」或反之的脱节。

## Background / Confirmed facts

- **F1 · 行业标准（搜索实证）**：NIST RBAC（Sandhu et al. 1996）定义 Permission =
  operation × object；成熟框架（若依/RuoYi、SpringBoot-Shiro）的实践——
  ① 后端只校验权限码不校验角色；② 权限码 `模块:资源:操作` 语义化全局唯一，前端后端共享；
  ③ 前端只隐藏、后端强制；④ 菜单/按钮节点挂权限码字段（perms），角色授权界面是权限树。
- **F2 · 旧项目的 system:* 码本就是标准**：portal mock 的 `system:user:list` /
  `system:menu:list` 正是 `模块:资源:操作` 的标准形态；11-04「全部自动码」将其退化为 m_<id>。
- **F3 · 用户决策（两轮）**：
  - 权限码落点 = **菜单节点挂 `permission` 字段**（修正第一轮「固定常量」的权宜决定）；
  - 鉴权范围 = 读写都鉴（读接口也加权限码）。
- **F4 · 现状鉴权缺口**：写端点 `requireAdmin`（校验角色，违背「校验权限码」）、读端点
  menus list 按授权 code 过滤（前端显示）——接口只有 admin 一道门槛，无操作级授权。
- **F5 · code vs permission 职责分离（code 删除）**：`code`（m_<id>）是 11-04 把「唯一标识」
  与「权限码」错误合并的产物——其全部消费点清点后，3 处有语义的（可见性过滤、授权值域校验、
  portal 按钮权限码）本任务迁到 `permission`，其余 3 处（创建回填、列表展示、unique 约束）均
  由主键 `id` 替代。故 `code` 列**一并删除**（迁移 0002 drop），`permission` 成为唯一授权锚点。
- **F6 · 可见性规则**：permission 为空的菜单 = 公开（所有登录用户可见）；permission 非空 =
  需角色授权；admin `*` 通配；匿名走 `scopes 含 C`（不变）。这比上一任务的「纯授权」更贴近
  行业实践（允许公开菜单，guest 不空）。
- **F7 · iam 无 Permission 组件**；portal 有但 apps 间不共享，iam 需自建（轻量、同语义）。
- **F8 · 权限码清单**（沿用旧项目命名）：
  - 菜单：`system:menu:list` / `system:menu:create` / `system:menu:update` / `system:menu:delete`
  - 用户：`system:user:list` / `system:user:assign` / `system:user:ban`
  - 角色：`system:role:list` / `system:role:assign`
- **F9 · 本机无 supabase CLI**：迁移静态自查 + mock 全验，本地栈/云部署留用户。

## Requirements

- **R1 · schema**：迁移 0002 给 `menus` 加 `permission text`（可选；目录/菜单节点存进入权限、
  按钮节点存操作权限；空 = 公开），**并 `drop column code`**（唯一标识回归主键 id）。种子：
  菜单节点补 permission（`system:menu:list` 等），按钮节点补操作码。
- **R2 · Edge Fn 鉴权**：新增 `requirePermission(perm)`（查 user_roles → role_permissions，
  含 perm 或 `'*'` 通过，否则 1011/403）；写端点与读端点（登录分支）从 `requireAdmin` /
  `requireAdminUsers` 迁移到 `requirePermission('system:menu:create')` 等。`requireAdmin`
  退役（或仅作内部 helper）。
- **R3 · 菜单可见性**（menusList 登录分支）：permission 为空 → 公开可见；非空 → 需
  `permSet.has(row.permission)`；admin `*` 全量；匿名 scopes 含 C 不变。
- **R4 · 菜单管理页**：动态表单的 button 类型加「权限码」输入框（`permission`，选填，占位
  `system:menu:create`）；菜单/目录类型也可填 permission（进入权限）。列表/表单字段同步。
- **R5 · 角色授权界面**：右侧菜单树勾选改为**按节点的 permission 收集**——勾选节点存其
  `permission`（空 permission 的公开节点不产生授权项，但仍可勾选以联动子树）；保存 = 存
  permission 集合进 role_permissions。操作权限（按钮节点）随树一起勾选，无需第二套列表。
- **R6 · 前端 Permission 组件**（iam 自建）：`<Permission code="system:menu:create">` 包裹
  按钮，code ∈ props.permissions 才渲染（支持 `mode="disabled"`）。页面写操作按钮改用它，
  替代 `readOnly` 粗粒度。
- **R7 · api 层**：`MenuInput`/`MenuItemRecord` 加 `permission`；menusApi 同步。
- **R8 · mock**：menu-handlers 种子补 permission；role-handlers 授权集合按 permission 校验
  （写端点 mock 按权限码 403，取代仅按 Authorization 身份）。
- **R9 · 测试**：requirePermission 语义（有/无码/通配/公开 permission 空）、菜单可见性
  （公开 vs 授权 vs 通配）、Permission 组件显隐、角色页权限树勾选保存。
- **R10 · 文档**：README 权限码清单 + 鉴权矩阵 + 可见性规则；spec 增补「权限码 = 接口鉴权
  锚点、菜单节点挂 permission、前端后端同源」约定。

## Acceptance Criteria

- **AC1** 无 `system:menu:create` 的角色调 `POST /menus` → 403；有该码（或 `*`）→ 通过。
- **AC2** 菜单可见性：permission 空的节点对登录用户可见；`system:menu:list` 的节点需授权；
  admin `*` 全量；匿名仍 scopes 含 C。
- **AC3** 角色页权限树：勾选菜单/按钮节点 → 存其 permission 进 role_permissions；角色列表
  显示权限数。
- **AC4** `<Permission code="system:menu:create">`：权限码在 props.permissions → 渲染，否则
  隐藏/禁用（与接口 403 同源）。
- **AC5** mock 双态可演示：guest 仅公开菜单 + 无写权限；admin `*` 全操作。
- **AC6** vitest 覆盖 R9；两 app build/tsc/prettier 绿；spec/README 一致。

## Out of scope

- 数据权限（行级 RLS / 数据范围）——本任务只做接口级。
- 角色继承层级（RBAC1 hierarchy）、职责分离（RBAC2 SoD）——当前 admin/guest 扁平够用，另任务。
- portal 旧 `system:*` 码的消费迁移（宿主侧，另任务）。
- 新增/删除角色（roles 表 CRUD，另任务）。

## Open questions (blocking)

（无——权限码落点（菜单节点 permission）与鉴权范围（读写都鉴）已由用户确认）

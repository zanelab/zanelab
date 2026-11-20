# Implement — RBAC 权限体系重构

> 设计依据：[design.md](./design.md)（DD1–DD7）。顺序：schema → Edge Fn（鉴权核心）→ api →
> 前端（组件→页面）→ mock → 测试 → 文档。

## 执行清单

- [x] **S1 · schema（DD1/DD2）**
  - `supabase/migrations/0002_permission.sql`：`alter table menus add column permission text;`
    （注释「目录/菜单=进入权限、按钮=操作权限、空=公开」）+ `drop column code` + guest 读码种子。
  - 种子：菜单节点补 `permission`（home 空=公开；iam 空=公开目录；users→`system:user:list`、
    menus→`system:menu:list`、roles→`system:role:list`；按钮节点→操作码）。静态自查（本机无 CLI）。

- [x] **S2 · Edge Fn 鉴权（DD3/DD4）**
  - `requirePermission(perm)`：resolveUser → userPermissions → 含 `*` 或 perm 通过，否则 401/403。
  - 端点迁移：`menusCreate/Update/Delete` → `system:menu:create/update/delete`；
    `usersAssignRoles` → `system:user:assign`；`usersBan` → `system:user:ban`；
    `rolesSavePermissions` → `system:role:assign`；读端点 `usersList`→`system:user:list`、
    `rolesList`→`system:role:list`、`menusList` 登录分支→`system:menu:list`。
  - 删 `requireAdmin` / `requireAdminUsers`；`menusList` 可见性：permission 空→公开、
    非空→permSet.has(permission)、admin `*` 全量；`MenuRow`/`MenuInput`/`MENU_COLUMNS`
    加 `permission`、删 `code`；删创建回填 `generatedCode` 逻辑；清 dead i18n key。

- [x] **S3 · api 层（DD1）**：`MenuItemRecord`/`MenuInput` 加 `permission`、删 `code`；rolesApi
  值域校验从「menus code」改「permission」；菜单页删「编码」列；portal `transformMenu`
  的 `raw.code` → `raw.permission`（+ portal mock 与测试同步）。

- [x] **S4 · Permission 组件（DD6）**：`apps/iam-web/src/components/Permission.tsx`，
  `<Permission code mode="hide|disabled">`，读 `getProps().permissions`；独立态 fallback 渲染。

- [x] **S5 · 菜单管理页（DD2）**：button/菜单类型加「权限码」输入框（permission 选填）；提交/回填
  加该字段；写操作按钮（新增/编辑/删除）用 `<Permission code>` 包裹（保留 readOnly 403 兜底）。

- [x] **S6 · 角色管理页（DD5）**：勾选树收集 `code` → `permission`（空 permission 节点联动子树
  但不产生授权项）；操作权限随按钮层级自动含入。

- [x] **S7 · mock（DD7）**：menu-handlers 种子补 permission；role-handlers 授权集合按 permission 存；
  写端点 mock 按 `can(resolvePermissions(request), perm)` 放行/403（`src/mocks/auth.ts` 三级身份
  admin `*` / guest 读码 / 匿名空）；guest 种子补读码。

- [x] **S8 · 测试（DD 语义）**：iam-web 41 用例全绿（含角色页权限树回显/匿名只读、mock 鉴权）；
  portal-web 179 用例全绿（transformMenu permission、flattenPermissions、global-state、Permission）。

- [x] **S9 · 文档**：README 权限码清单表 + 鉴权矩阵 + 可见性规则；spec 增补
  「权限码 = 接口鉴权锚点、菜单节点挂 permission、前端后端同源」。

## 验证命令

```bash
pnpm --filter @zanelab/iam-web test
pnpm --filter @zanelab/iam-web exec tsc --noEmit
pnpm --filter @zanelab/iam-web exec tsc --noEmit -p supabase/functions/tsconfig.json
pnpm --filter @zanelab/iam-web build
pnpm --filter @zanelab/portal-web build && pnpm --filter @zanelab/portal-web test
grep -rn "functions/v1" apps/iam-web/src | grep -v "src/api/\|src/mocks/"   # 期望空
```

**手动（AC2/AC5 浏览器面）**：mock 路线起 dev，guest 登录看公开菜单、点写操作按钮不显示
（或显示但接口 403）；admin 全量。

## 风险文件与回滚点

| 位置 | 风险 | 处置 |
|---|---|---|
| Edge Fn 鉴权迁移 | 端点漏迁移或权限码写错 → 合法操作 403 / 非法操作放行 | S8 的 requirePermission 用例覆盖每个端点；mock 同语义双保险 |
| 读端点加码 | guest 种子漏补 `system:menu:list` → 登录空菜单 | S7 guest 种子明确；AC2 断言 |
| 角色页收集逻辑 | code→permission 迁移时遗漏 | S6 单点改；S8 用例断言保存内容 |

回滚：revert + `db reset`（本地）；云上加列非破坏性。

## `task.py start` 前的待确认项

（无）

# Design — RBAC 权限体系重构（语义权限码 + 权限树 + 接口鉴权）

> 事实编号（F1…F9）见 [prd.md](./prd.md)。本文件记录技术设计与权衡。

## 决策记录

### DD1 · 权限码与菜单标识分离

```
menus.id          主键，唯一标识（code 列删除——11-04 合并标识与权限码的错误产物）
menus.permission  语义权限码（system:menu:list），授权与鉴权的 key —— 新增列
```

纠正 11-04「code 即权限码」的混用：code 的全部消费点清点后，有语义的迁到 permission、纯标识
的由 id 替代，故 **drop column code**。权限码值沿用旧项目 `模块:资源:操作` 习惯（`system:*`），
与 portal mock 的 `system:user:list` 一脉相承。

### DD2 · 权限码清单（固定值，但挂在节点上而非代码常量表）

| 模块 | 读（菜单节点） | 写（按钮节点） |
|---|---|---|
| menu | `system:menu:list` | `system:menu:create` / `system:menu:update` / `system:menu:delete` |
| user | `system:user:list` | `system:user:assign` / `system:user:ban` |
| role | `system:role:list` | `system:role:assign` |

权限码是**数据**（菜单节点的 permission 字段值），不是代码常量——新增一个操作 = 建一个
button 节点并填 permission，不改代码。Edge Fn 的 `requirePermission` 只是「比对传入的码」，
不内建清单。

### DD3 · 鉴权：requirePermission（取代 requireAdmin）

```ts
async function requirePermission(
  ctx: { supabaseAdmin: SupabaseClient },
  req: Request,
  lang: string,
  perm: string,
): Promise<{ id: string } | Response> {
  const user = await resolveUser(ctx, req.headers.get('authorization'));
  if (!user) return /* 401 */;
  const perms = await userPermissions(ctx, user.id);   // 已有 helper，含 '*'
  if (perms.includes('*') || perms.includes(perm)) return user;
  return /* 403 */;
}
```

- **只校验权限码，不校验角色**（F1 铁律）；admin 是「`*` 通配」而非「role==admin」。
- 读端点的登录分支同样加码（`system:menu:list` 等）；匿名分支（scopes 含 C）不鉴权。
- `requireAdmin` / `requireAdminUsers` 删除，调用点全部迁移。

### DD4 · 菜单可见性（menusList 登录分支）

```
permission 为空   → 公开（所有登录用户可见）
permission 非空   → permSet.has(permission)（角色授权）
admin '*'         → 全量（含 hidden）
匿名              → scopes 含 C（不变）
```

比上一任务的「纯授权」更贴近行业实践：公开菜单（permission 空）不需要授权，guest 登录不空。
祖先链保留（子节点可见时父链保留）。

### DD5 · 角色授权界面 = 权限树

- 右侧树数据源 = `menusApi.list()`（含 permission 字段的菜单树）。
- 勾选节点 → 收集其 `permission`（非空才入集合；空 permission 的公开节点可勾选以联动子树，
  但不产生授权项）。
- 保存 = `PUT /roles/:id/permissions` 存 permission 集合；还原 = 回到进入时的集合。
- 与上一任务的角色页结构一致，只是「收集 code」改为「收集 permission」，并**天然包含按钮
  节点的操作权限**（树里有按钮层级），无需第二套操作码列表。

### DD6 · 前端 Permission 组件（iam 自建）

```tsx
<Permission code="system:menu:create" mode="hide|disabled">
  <button>新增</button>
</Permission>
```

- 数据源 `props.permissions`（宿主 flattenPermissions 提取的 permission 数组，F2 链路已通）。
- 独立态（props 缺省）fallback：渲染（不隐藏）——独立 dev 无宿主权限注入，写操作仍靠接口
  403 兜底（符合「前端只隐藏、后端强制」）。

### DD7 · mock 的权限判定

- menu-handlers 种子补 permission；role-handlers 的授权集合按 permission 存。
- 写端点 mock：从「Authorization 身份判定」升级为「角色授权集合含对应 permission 才放行，
  否则 403」——与 Edge Fn requirePermission 同语义。
- guest 种子授权：公开菜单（permission 空）无需授权；`system:menu:list` 等读码授权给 guest
  （否则登录空菜单）。

## 改动边界

| 文件 | 改动 |
|---|---|
| `supabase/migrations/0002_permission.sql` | 新建：menus 加 `permission text` + `drop column code`；种子补码 |
| `supabase/functions/iam/index.ts` | requirePermission + 全部端点迁移；menusList 可见性；MenuRow/MenuInput 加 permission |
| `apps/iam-web/src/api/menus.ts` | MenuItemRecord/MenuInput 加 permission |
| `apps/iam-web/src/api/roles.ts` | 不变（rolesApi 已存 permission 语义，值域校验从 menus code 改 permission） |
| `apps/iam-web/src/pages/MenuManagementPage.tsx` | button/菜单节点表单加 permission 输入框 |
| `apps/iam-web/src/pages/RoleManagementPage.tsx` | 勾选收集 code → permission；操作权限随树 |
| `apps/iam-web/src/components/Permission.tsx` | 新建 |
| `apps/iam-web/src/mocks/menu-handlers.ts` / `role-handlers.ts` | 种子补 permission；鉴权按 permission |
| `apps/iam-web/src/utils/http.ts` | 不变（401 单飞与权限无关） |
| `README.md` + spec | 权限码清单、鉴权矩阵、可见性规则 |

**不改动**：roles 表结构。（portal transformMenu 的 `raw.code` → `raw.permission` 属本任务
切换链的一环，见 S3。）

## 相容性与风险

- **读端点加码的破坏性**：登录用户调 `GET /auth/menus` 现在要求 `system:menu:list`——guest 种子
  必须补该码（DD7），否则登录空菜单。这是预期行为变化，PRD AC2 已含。
- **旧 code 过滤 → permission 过滤**：上一任务「纯授权按 code 过滤」改「按 permission 过滤」，
  menusList 逻辑重写；menu mock 种子 code 与 permission 需同步（种子补 permission）。
- **回滚**：revert + db reset；云上迁移（加列）非破坏性，但种子更新需 db push。

## 待评审确认项

（无——权限码落点与鉴权范围已由用户确认）

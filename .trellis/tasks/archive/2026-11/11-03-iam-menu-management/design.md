# Design — iam-web 菜单管理（全栈 + RBAC 初始化）

> 事实编号（F1…F9）见 [prd.md](./prd.md)。本文件记录技术设计与权衡。

## 决策记录

### DD1 · 数据模型（四表 + 触发器初始化）

```sql
-- 迁移 1：表结构
create table public.menus (
  id bigint generated always as identity primary key,
  pid bigint references public.menus(id) on delete cascade,  -- null = 根
  code text not null unique,
  parent text not null default 'root',
  name text not null,
  component text not null default '',
  uri text,
  type text not null check (type in ('app','menu','button','group')),
  sort int not null default 0,
  icon text,
  hidden boolean not null default false,
  scopes text[] not null default '{O}',
  menu_type int not null default 1,      -- 0=目录 1=菜单 2=按钮（RawMenuItem 语义）
  created_at timestamptz not null default now()
);

create table public.roles (
  id bigint generated always as identity primary key,
  code text not null unique,             -- 'guest' / 'admin'
  name text not null
);

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id bigint not null references public.roles(id) on delete cascade,
  primary key (user_id, role_id)
);

create table public.role_permissions (
  role_id bigint not null references public.roles(id) on delete cascade,
  permission text not null,              -- 权限码，如 'system:menu:list'
  primary key (role_id, permission)
);
```

- **字段与 `RawMenuItem` 对齐**（F2）：`pid`/`code`/`parent`/`name`/`component`/`uri`/`type`/
  `sort`/`icon`/`hidden`/`scopes`/`menuType` 全部有落点——宿主 `fetchMenus` 的消费端不改就能读。
  沿用旧字段名（`menu_type`/`scopes`），**不做**现代化改名（跨系统契约优先于审美）。
- **删除策略**：`pid on delete cascade` —— 删除父节点级联删子树（R4 的「级联」选项）。
  UI 层删除前仍提示「将同时删除 N 个子节点」，但数据库层不再单独拦截。
- **初始化**：迁移内种子 `roles` 两行 + `role_permissions` 种子：

| 角色 | 权限码种子 |
|---|---|
| `admin` | `*`（通配，服务端判定时展开）+ `system:menu:list/create/update/delete` |
| `guest` | 无（只能看到 `hidden=false` 且标记为公开的菜单子集，见 DD3） |

- **首个注册用户 → admin**（F5）：用 `auth.users` 的 INSERT 触发器：

```sql
create function public.handle_new_user() returns trigger
security definer set search_path = public as $$
begin
  insert into public.user_roles (user_id, role_id)
  select new.id, r.id from public.roles r
  where r.code = case
    when not exists (select 1 from public.user_roles) then 'admin'
    else 'guest' end;
  return new;
end $$ language plpgsql;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

`not exists (select 1 from user_roles)` = 「我是第一个拿到角色的人」。并发窗口内两个用户同时注册
理论上可能双 admin——接受（内部管理系统的注册频率使然），design 记录不做分布式锁。

**备选（否决）**：Edge Fn 注册后置逻辑——需要前端在 OTP 验证后多调一个「init」端点，时序脆弱
（用户直接走 Supabase 控制台建用户就绕过了）；触发器在数据库层保证，无时序问题。

### DD2 · Edge Fn 端点与鉴权

```
GET    /auth/menus          匿名可调：无/无效 JWT → 游客可见子集；有效 JWT → 按权限
POST   /menus               仅 admin
PUT    /menus/:id           仅 admin
DELETE /menus/:id           仅 admin
```

- **路径分派沿用 `path.endsWith(...)`** 模式（F4）；`/menus/:id` 用 `path.match(/\/menus\/(\d+)$/)`。
- **身份解析**：`ctx.supabase.auth.getUser(token)` —— 从 `Authorization: Bearer` 解 user；
  解析失败 = 匿名（不是 401，走游客分支——**这是 Q2「未登录返回游客菜单」的直接实现**，
  AC5 对应）。
- **写端点鉴权**：无有效 JWT → `error(lang, 1010, 'unauthorized', 401)`；有 JWT 但非 admin →
  `error(lang, 1011, 'forbidden', 403)`。admin 判定 = `user_roles` join `roles.code='admin'`。
- **游客可见子集的判定**：`hidden=false` 且 `uri` 非空的 `type in ('menu','app')` 顶层项 + 其父链
  （MVP：`hidden=false` 过滤；「公开标记」字段不新增——旧契约里 `scopes: ['O']` 即对外可见的
  旧语义，沿用：`scopes contains 'O'`）。DD3 细化。
- **登录用户可见性**：`role_permissions.permission` 集合 → 菜单树按 `code`/按钮 `permission`
  过滤：`type='button'` 的 `uri` 字段存权限码（旧契约语义），与用户权限集比对；菜单节点无权限码
  要求即可见（管理页本身的可见性由宿主菜单树控制，服务端不重复拦）。
- **i18n**：新增 `unauthorized`/`forbidden`/`codeExists`（code 唯一冲突）等键进 `t` 表。

### DD3 · 游客可见子集（精确规则）

`GET /auth/menus` 返回：
1. **匿名请求**：`hidden=false AND scopes @> '{O}'` 的节点中，`type='menu'` 且无 `permission`
   要求的项 + 其祖先链（保持树形完整）。MVP 种子数据：仅「首页」。
2. **登录用户**：用户角色 → `role_permissions` 并集 `P`；
   - 树保留：节点可见 ⇔ `hidden=false` 且（无权限要求 或 `permission ∈ P`）；
   - `admin` 的 `P` 含 `*` → 全量。
3. **返回形状**：`RawMenuItem[]` 树（`children` 嵌套），与宿主 `fetchMenus` 消费形状一致（F2）。

### DD4 · 前端 api 层（R3）

```ts
// endpoints.ts 增
export const MENUS_LIST_PATH = '/functions/v1/iam/auth/menus';
export const MENUS_COLLECTION_PATH = '/functions/v1/iam/menus';
export const MENUS_ITEM_PATH = (id: number | string) => `/functions/v1/iam/menus/${id}`;

// api/menus.ts（新文件，第二域）
export const menusApi = {
  list(): Promise<MenuItemRecord[]>,       // GET，envelope data = RawMenuItem 树
  create(input: MenuInput): Promise<MenuItemRecord>,
  update(id, input: MenuInput): Promise<MenuItemRecord>,
  remove(id): Promise<void>,
};
```

- **领域类型** `MenuItemRecord` 对齐 `RawMenuItem`（13 字段），**从 iam 侧自有定义**（apps 间
  不共享代码；portal 的 `RawMenuItem` 是私有类型不导出——复制定义并注释来源）。
- **鉴权头**：集成态由宿主 http 拦截器注入；独立态由 `utils/http.ts` 本地客户端注入
  （已有 Bearer 逻辑，token 来自 `iam_token`）。api 层不感知鉴权——传输层职责。
- **错误语义**：沿用 `throw new Error(msg)` 四级提取（10-31 确立）；401/403 的后端 msg 透出。

### DD5 · 页面（R4）

- **结构**：`MenuManagementPage` = 工具栏（新增按钮）+ 树形表格（daisyUI `table` + 手写树缩进；
  daisyUI 无 tree 组件，用 `collapse`/缩进 + `join` 操作列组装——写前查组件指南确认）+
  新增/编辑 `modal`（表单：name/code/uri/type/select/sort/hidden/toggle，`validator` 校验）+
  删除确认 `modal`（显示级联子树数量警告）。
- **树操作抽纯函数** `src/utils/menu-tree.ts`：`buildTree(flat)` / `flatten(tree)` /
  `countDescendants(id)` / `filterTree(...)`——可单测（R6 覆盖点）。
- **数据流**：mount 拉 `menusApi.list()` → `buildTree` → 渲染；CRUD 成功后**重拉**（不乐观更新
  ——树形 + 级联删除下乐观更新复杂度不值当）。
- **身份驱动的 UI 分支**：admin 显示操作列；游客（或 401/403 响应）只读 + 顶部提示。
  页面自己的身份判定 = list 响应的附加字段？**否**——用「写操作被 403 后置为只读」+ 独立态从
  `props.permissions` 判断（F3，集成态宿主注入）。MVP：渲染时带操作列，403 时 toast + 保持只读。
- **占位替换**：`App.tsx` 加 `<Route path="menus" element={<MenuManagementPage />} />`；
  `SystemPage` 保留（users/roles 仍是占位）。

### DD6 · MSW mock（R5）

`src/mocks/menu-handlers.ts`：内存 `let menus: MenuRow[]`（种子 = portal mock 的菜单树同款数据）；
`pagePaths()` 派生两类路径（独立 `/functions/v1/...`、集成 `/iam/functions/v1/...`）。
**双身份模拟**：handler 读 `Authorization` 头——无/Bearer mock-guest → 游客子集 + 写操作 403；
`Bearer mock-admin` → 全量 + 写成功。README 写明 mock 下如何切换身份（devtools 改 localStorage
`iam_token` = `mock-admin`）。

### DD7 · 测试栈（R6，F8）

照 portal 模式补 iam-web：devDeps（vitest、jsdom、@testing-library/react、@testing-library/user-event、
@testing-library/jest-dom）+ `vitest.config.ts`（`test.environment: 'jsdom'` + setup 文件装 MSW
node server）+ `package.json` `test` script。**MSW node server 复用 browser handlers**
（`src/mocks/server.ts` 新文件，`setupServer(...iamOtpHandlers, ...iamMenuHandlers)`）。
覆盖：`menu-tree.ts` 纯函数（buildTree/flatten/countDescendants）、`api/menus.ts` 归一化与
错误提取（stub http 层）、`MenuManagementPage`（MSW 下渲染树/新增/删除/游客只读分支）。

### DD8 · 不做 RLS（Q2 推论）

表不启 RLS：Edge Fn 是唯一写入口（service role 上下文），前端不直连 Postgres（无 supabase-js
查询，全部经 Edge Fn）。RLS 在「前端直查 DB」场景才有意义，本架构下是纯开销。spec 记录该边界：
**若将来引入 supabase-js 直查，必须先补 RLS**。

## 数据流

```
MenuManagementPage
  └─ menusApi.list()                    ← src/api/menus.ts（DD4）
       └─ utils/http.ts（Bearer iam_token / 宿主拦截器）
            └─ Edge Fn GET /auth/menus  ← DD2/DD3：匿名→游客子集；JWT→按权限
                 └─ Supabase SQL（menus/roles/user_roles/role_permissions）
  └─ buildTree → 树形表格 → CRUD → menusApi.create/update/remove → 重拉

mock：MSW handler（DD6）在 dev 拦截同一组路径，内存数据 + Authorization 判身份
```

## 改动边界

| 文件 | 改动 |
|---|---|
| `apps/iam-web/supabase/migrations/0001_rbac_init.sql` | 新建：四表 + 种子 + 触发器（DD1） |
| `apps/iam-web/supabase/functions/iam/index.ts` | 新增菜单端点 + 鉴权 + i18n 键（DD2/DD3） |
| `apps/iam-web/src/api/endpoints.ts` | 增 3 个常量（DD4） |
| `apps/iam-web/src/api/menus.ts` | 新建（DD4） |
| `apps/iam-web/src/utils/menu-tree.ts` | 新建：树操作纯函数（DD5） |
| `apps/iam-web/src/pages/MenuManagementPage.tsx` | 新建（DD5） |
| `apps/iam-web/src/App.tsx` | 加 menus 路由（DD5） |
| `apps/iam-web/src/mocks/menu-handlers.ts` + `server.ts` | 新建（DD6/DD7） |
| `apps/iam-web/package.json` + `vitest.config.ts` + `src/test/setup.ts` | 测试栈（DD7） |
| `apps/iam-web/README.md`、`.trellis/spec/frontend/*` | 文档（R7） |

**不改动**：portal-web 任何文件；iam 的 auth 域 api；宿主 `fetchMenus`/`transformMenu`。

## 相容性与风险

- **宿主消费**：新表数据经 `GET /auth/menus` 返回 `RawMenuItem` 形状——但宿主现在拉的是
  `config.js` 里 `menusEndpoint` 指向的旧后端，**不指向 iam**。本任务不切宿主数据源（out of
  scope），无相容性冲击；将来切换时 `transformMenu` 无需改动（形状已对齐）。
- **迁移顺序**：`supabase db reset` 会重放全部迁移——首个迁移必须是幂等安全的
  （`create table if not exists` 或全新库）。
- **触发器与 `shouldCreateUser: true`**：OTP 登录会自动建用户（现有 Edge Fn 行为）→ 触发器
  即时给角色——「第一个注册用户」在 OTP 流下自动成立，无需改 OTP 端点。
- **回滚**：revert 提交 + `supabase db reset`（本地）；云上无部署则无影响。

## 待评审确认项

- DD1 的双 admin 并发窗口（接受）与级联删除（`on delete cascade`）。
- DD3 游客子集规则（`hidden=false + scopes@>{O} + 无权限要求`）。
- DD8 不做 RLS 的边界声明。

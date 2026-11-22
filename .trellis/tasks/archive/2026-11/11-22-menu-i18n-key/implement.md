# Implement — 菜单 i18nKey 多语言链路

> 执行清单按依赖顺序排列。每步给出落点、验证命令与回滚点。
> 前置：PRD + design 已评审通过，`task.py start` 已执行（status = in_progress）。

## 步骤总览

| # | 步骤 | 层 | 落点 |
|---|---|---|---|
| 1 | DB 迁移：加列 + 回填 seed 节点 | DB | `apps/iam-web/supabase/migrations/0007_menu_i18n_key.sql` |
| 2 | edge fn：读写透传 i18n_key | Edge | `apps/iam-web/supabase/functions/iam/index.ts` |
| 3 | iam-web api 层：类型 + 归一 | 前端 | `apps/iam-web/src/api/menus.ts` |
| 4 | iam-web 管理页：表单 + 表格列 + 文案 | 前端 | `apps/iam-web/src/pages/MenuManagementPage.tsx` + locales |
| 5 | portal-web：RawMenuItem + transformMenu 映射 | 前端 | `apps/portal-web/src/api/menu.ts` |
| 6 | mock 同步 | 前端 | `apps/iam-web/src/mocks/menu-handlers.ts`、`apps/portal-web/src/mocks/handlers.ts` |
| 7 | 测试补充/更新 | 测试 | 各包既有 test 文件 |
| 8 | 全量验证 | 全栈 | 见「验证命令」 |

---

## 步骤 1：DB 迁移

**新增** `apps/iam-web/supabase/migrations/0007_menu_i18n_key.sql`：

```sql
-- 0007: menus 表加 i18n_key 列（菜单多语言翻译键）+ 回填 seed 导航节点
--
-- 背景：菜单文案此前只有单语言 name 列，宿主 portal-web 已有 i18nKey 渲染期
-- 解析机制（menuTitle()），但接口从未下发该键 → 链路断在数据层。
-- 本迁移补齐存储侧：name 保持 not null 作为回退原文，i18n_key 可空（空 = 不配）。
--
-- 幂等：add column if not exists；回填带 `and i18n_key is null` 守卫
-- （不覆盖 admin 已配的值，可重复执行）。

alter table public.menus
  add column if not exists i18n_key text;

-- 回填 seed 的 5 个导航节点（按 permission/uri 定位——name 可能被 admin 改过，
-- 不是稳定标识；button 节点是权限码载体、name 不进宿主导航文案，不回填）
update public.menus set i18n_key = 'menus.home'
  where uri = '/home' and i18n_key is null;

update public.menus set i18n_key = 'menus.system.title'
  where component = 'iam' and type = 'app' and i18n_key is null;

update public.menus set i18n_key = 'menus.system.users'
  where permission = 'system:user:list' and i18n_key is null;

update public.menus set i18n_key = 'menus.system.menus'
  where permission = 'system:menu:list' and i18n_key is null;

update public.menus set i18n_key = 'menus.system.roles'
  where permission = 'system:role:list' and i18n_key is null;
```

**验证**：迁移文件能被 `supabase db push` / `supabase migration up` 应用；重复执行不报错。

**回滚点**：删列会丢 admin 已配的 key —— 不做自动回滚脚本（列残留无害，
代码层回退即可）。回滚只需还原后续代码改动。

---

## 步骤 2：edge fn 透传

**文件**：`apps/iam-web/supabase/functions/iam/index.ts`

1. `MENU_COLUMNS`（约 431 行）在 `name` 后追加 `i18n_key`
2. `MenuRow`（约 394 行）加 `i18n_key: string | null;`
3. `MenuInput`（约 412 行）加 `i18n_key?: string | null;`
4. `parseMenuInput`（约 726 行）加双形态解析（camel `i18nKey` 优先兼容 snake
   `i18n_key`，与既有 `active_icon`/`activeIcon` 同款）+ `trim()` + 空串归一 null

**注意**：
- `toTree` / `fetchAllRows` / `menusCreate` / `menusUpdate` 用 `{...row}` /
  `{...input}` 展开 —— `i18n_key` 自动透传，**不需要改这四处**
- `TYPE_FIELD_MATRIX` 不动（i18nKey 对四种类型都可填）
- `parseMenuInput` 的空串归一：`String(v).trim() || null`

**验证**：
```bash
cd apps/iam-web && npx tsc -p supabase/functions/tsconfig.json
```

**回滚点**：edge fn 单独回滚部署 —— 但**不可在 DB 迁移之前回退新 edge fn**
（选不到不存在的列）。部署顺序见 design §7。

---

## 步骤 3：iam-web api 层

**文件**：`apps/iam-web/src/api/menus.ts`

1. `MenuItemRecord` 加 `i18nKey?: string | null;`
2. `MenuInput`（前端提交形态）加 `i18nKey?: string | null;`
3. 归一层：`mapActiveIcon` 扩为同时映射 `active_icon`→`activeIcon` 与
   `i18n_key`→`i18nKey`，函数改名 `mapRow`（或 `normalizeRow`），
   四处调用点（`listAll` / `list` / `create` / `update`）同步改名
4. `RawMenuNode` 类型（该文件内的宽松行类型）加 `i18n_key?: string | null`

**验证**：
```bash
cd apps/iam-web && npx tsc --noEmit -p tsconfig.json
```

---

## 步骤 4：iam-web 管理页

**文件**：`apps/iam-web/src/pages/MenuManagementPage.tsx`

1. `MenuFormState` 加 `i18nKey: string;`
2. `EMPTY_FORM` 加 `i18nKey: ''`
3. 表单 → 行的转换（`row` → `form`，约 208 行）加 `i18nKey: row.i18nKey ?? ''`
4. 表单 → 请求体（约 271 行）加 `i18nKey: form.i18nKey.trim() || null`
5. 表单 UI：新增「国际化键」输入框（选填），placeholder 格式说明
6. 表格列：展示 i18nKey（有值时显示）
7. `apps/iam-web/src/locales/{zh-CN,en-US}.json`：补 `iam.menu.i18nKey*` 文案
   （列标题 + 输入框 label + placeholder）

**注意**：`MenuFormState` 的 `EMPTY_FORM`、编辑态装载、提交体三处必须同步 ——
漏一处会导致编辑时 i18nKey 显示为空或保存时丢失。

**验证**：
```bash
cd apps/iam-web && npx vitest run src/pages/MenuManagementPage.test.tsx
```

---

## 步骤 5：portal-web 映射

**文件**：`apps/portal-web/src/api/menu.ts`

1. `RawMenuItem` 加 `i18n_key?: string | null;`
2. `transformMenu` 的 `button` 分支（构造只含 id/name/path/permission 的 item）
   加 `i18nKey: raw.i18n_key ?? undefined`
3. `transformMenu` 主分支的 `item` 字面量加 `i18nKey: raw.i18n_key ?? undefined`

**不需要改**：`apps/portal-web/src/locales/i18n.ts` 的 `menuTitle()`（已就绪）、
`packages/types/src/index.ts` 的 `MenuItem.i18nKey`（已存在）、
各消费组件（已走 `menuTitle()`）。

**验证**：
```bash
cd apps/portal-web && npx tsc -b
```

---

## 步骤 6：mock 同步

1. `apps/iam-web/src/mocks/menu-handlers.ts`：
   - 种子菜单补 `i18nKey` 字段（至少给一个带值、一个不带，覆盖两条分支）
   - create handler（约 261 行 `name: String(body.name)`）附近加
     `i18nKey: body.i18nKey ?? body.i18n_key ?? null`
   - update handler（约 310 行）同上
2. `apps/portal-web/src/mocks/handlers.ts` 的 `mockRawMenus`：补 `i18n_key`
   （至少 seed 节点带值，其余不带）

**验证**：`vitest run` 时 mock 相关的既有测试不回归。

---

## 步骤 7：测试补充

**iam-web**（`src/api/menus.test.ts` 既有文件）：
- `mapRow` 归一：`i18n_key` → `i18nKey`
- `create`/`update` 请求体含 `i18nKey`

**iam-web**（`src/pages/MenuManagementPage.test.tsx` 既有文件）：
- 表单 i18nKey 输入 → 提交体含该值
- 编辑既有菜单 → 输入框回填既有 i18nKey

**portal-web**（`src/locales/i18n.test.ts` 既有文件，已含 menuTitle 断言）：
- 已有断言覆盖「i18nKey 命中取翻译 / 未命中回退 name / 无 i18nKey 用 name」
  —— 本次只需确认 `transformMenu` 产出的 `i18nKey` 能被 `menuTitle` 消费
- 在 `src/api/menu.ts` 相关的测试（如有）加 `i18n_key` → `i18nKey` 映射断言；
  若无该文件的测试，则在 `src/locales/i18n.test.ts` 补一条经 transformMenu
  的端到端断言

**注意**：edge fn 无测试基建（design §6）—— 不新建体系。

---

## 步骤 8：验证命令

```bash
# 类型检查
cd apps/iam-web && npx tsc --noEmit -p tsconfig.json
cd apps/iam-web && npx tsc -p supabase/functions/tsconfig.json
cd apps/portal-web && npx tsc -b

# 测试
cd apps/iam-web && npx vitest run
cd apps/portal-web && npx vitest run

# 构建
pnpm --filter @zanelab/iam-web build
pnpm --filter @zanelab/portal-web build

# lint（portal-web 有 lint 脚本）
pnpm --filter @zanelab/portal-web lint
```

**人工联调（无法自动化的部分）**：
1. 迁移应用到本地 Supabase 后，`select id, name, i18n_key from menus` 确认 seed
   5 节点已回填
2. `GET /functions/v1/iam/auth/menus` 确认响应含 `i18n_key`
3. iam 管理页填一个 key → 保存 → 重拉列表确认持久化
4. portal-web 切 zh-CN ↔ en-US，确认侧边栏 / 面包屑 / tabbar 文案切换
5. 填一个语言包里不存在的 key → 确认静默回退 `name` 原文（不白屏）

---

## 风险文件与回滚点

| 文件 | 风险 | 回滚方式 |
|---|---|---|
| `apps/iam-web/supabase/functions/iam/index.ts` | edge fn 选列失败 → 菜单接口 500（**部署顺序敏感**，见 design §7） | 回滚 edge fn 部署（DB 列残留无害） |
| `apps/iam-web/supabase/migrations/0007_*.sql` | 回填条件写错 → 填到非 seed 节点 | `update ... set i18n_key = null where ...` 手工纠正；重新执行迁移幂等 |
| `apps/iam-web/src/api/menus.ts` | 归一层改名漏改调用点 → 编译期可发现 | 编译错误即回退 |
| `apps/portal-web/src/api/menu.ts` | `button` 分支漏映射 → 按钮节点文案不翻译 | 补映射；无 DB 影响 |

## 实施前检查清单

- [ ] PRD / design / implement 已评审通过
- [ ] `task.py start` 已执行
- [ ] 迁移文件编号确认（当前最新 = `0006_seed_skills_button.sql` → 新文件用 `0007_`）
- [ ] 确认无其它分支/任务也在改 `menus` 表结构

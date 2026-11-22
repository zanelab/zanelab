# 菜单 i18nKey 多语言链路（iam 配置 → /auth/menus → portal 渲染）

## Goal

让后台（iam）配置的导航菜单支持多语言：admin 在菜单管理页为菜单节点填写一个
国际化键（i18nKey，如 `menus.system.users`），宿主按当前语言从语言包解析出标题，
切换语言后侧边栏 / 顶栏 / 面包屑 / tabbar / 用户下拉框的菜单文案随之切换。

用户价值：菜单文案不再硬绑在数据库的单一 `name` 字段上，后台配置菜单时即可声明
它的多语言身份，无需改代码发版。

## Background（已确认的仓库事实）

**宿主侧机制已就绪（09-09-i18n 任务已建）：**

- 共享类型已有字段：`packages/types/src/index.ts:15` — `MenuItem.i18nKey?: string`
- 渲染期统一解析：`apps/portal-web/src/locales/i18n.ts:165` `menuTitle()` —
  `i18nKey` 命中语言包取翻译，未命中/为空回退接口原文 `name`
- 消费点已统一走 `menuTitle()`：侧边栏 / 顶栏（`apps/portal-web/src/utils/menu-views.ts:10`）、
  tabbar（`apps/portal-web/src/components/layouts/basic/tabbar/use-tabbar.ts:48`）、
  面包屑、用户下拉框
- 外部语言包懒加载已支持：`apps/portal-web/src/locales/i18n.ts:56` —
  `config.js` 的 `i18n.packUrls` 按语言懒 fetch，深合并进 translation 命名空间
- 语言通道已通：`apps/portal-web/src/utils/session-headers.ts` 每请求注入
  `x-client-info: lang=zh_CN|en_US`（edge fn `detectLang` 解析）
- 内置语言包已有 seed 菜单的对应条目：
  `apps/portal-web/src/locales/zh-CN.json` / `en-US.json` 的 `menus.*` 段
  （`menus.home`、`menus.system.{title,users,menus,roles}`）

**链路断点（本次要补的）：**

1. **DB 无 i18n_key 列**：`apps/iam-web/supabase/migrations/0001_rbac_init.sql:5-19`
   的 `menus` 表只有单语言 `name`（`not null`）
2. **edge fn 不透传**：`apps/iam-web/supabase/functions/iam/index.ts:431`
   `MENU_COLUMNS` 不含 `i18n_key`；`MenuRow` / `MenuInput`（同文件 394-427 行）无该字段；
   `parseMenuInput`（726 行）不解析该字段
3. **iam 管理页无配置项**：`apps/iam-web/src/pages/MenuManagementPage.tsx`
   `MenuFormState`（31-45 行）与 `EMPTY_FORM`（47-60 行）无 i18nKey 字段
4. **portal 不映射**：`apps/portal-web/src/api/menu.ts` `RawMenuItem`（8-25 行）无
   `i18n_key`；`transformMenu`（105 行起）构造的 `item` 不写 `i18nKey`
   —— **注意 `MenuItem.i18nKey` 字段本身已存在，只是从未被赋值**

## Requirements

### R1 数据层：menus 表新增 i18n_key 列

- 新增迁移 `apps/iam-web/supabase/migrations/0007_*.sql`：`alter table public.menus
  add column if not exists i18n_key text`（可空，无默认值，不动既有行）
- 列语义：国际化键的点串（如 `menus.system.users`），空 = 该节点不做多语言（渲染回退 `name`）
- `name` 保持 `not null` 且继续作为回退原文 —— i18nKey 方案不改变 name 的必填性

### R2 edge fn：读写透传 i18n_key

`apps/iam-web/supabase/functions/iam/index.ts`：

- `MENU_COLUMNS` 加 `i18n_key`（`select` 会原样返回 snake_case）
- `MenuRow` 加 `i18n_key: string | null`；`MenuInput` 加 `i18n_key?: string | null`
- `parseMenuInput` 解析 `i18n_key`（并兼容 camelCase `i18nKey` 入参，
  与既有 `active_icon`/`activeIcon` 双形态兼容同款）
- `toTree` / `fetchAllRows` / `menusCreate` / `menusUpdate` 自然透传（`{...row}` 展开）
- 类型联动矩阵 `TYPE_FIELD_MATRIX` 不变 —— i18nKey 对四种类型（app/menu/group/button）都可填，
  不做按类型裁剪

### R3 iam 菜单管理页：提供 i18nKey 配置项

`apps/iam-web/src/pages/MenuManagementPage.tsx`：

- `MenuFormState` + `EMPTY_FORM` 加 `i18nKey: string`
- 表单新增「国际化键」输入框（选填），带 placeholder 说明点串格式
- 表格列展示 i18nKey（有值时显示，便于 admin 核对）
- 提交时随 `menusApi.create/update` 的 `MenuInput` 传 `i18nKey`
- `apps/iam-web/src/api/menus.ts`：`MenuItemRecord` 加 `i18nKey?: string | null`；
  `MenuInput` 加 `i18nKey?: string | null`；`mapActiveIcon` 同款映射 snake→camel
  （`i18n_key` → `i18nKey`）
- iam 语言包补 `iam.menu.i18nKey*` 相关文案（zh-CN / en-US 各一份）

### R4 portal-web：映射并解析

`apps/portal-web/src/api/menu.ts`：

- `RawMenuItem` 加 `i18n_key?: string | null`
- `transformMenu` 构造 `item` 时写 `i18nKey: raw.i18n_key ?? undefined`
  （`button` 分支同样带上 —— button 节点的 name 也可能进下拉框/面包屑）
- 渲染期无需改动：`menuTitle()` 已按 `i18nKey` 优先、`name` 回退解析

### R5 语言包与译文来源

- **内置菜单译文**（seed 菜单：`首页`/`系统管理`/`用户管理`/`菜单管理`/`角色管理`）：
  补进 `apps/portal-web/src/locales/{zh-CN,en-US}.json` 的 `menus.*` 段
  （`menus.home` 与 `menus.system.*` 已存在，需与 seed 节点逐一对应）
- **第三方/后台新建菜单的译文**：走既有 `config.js` 的 `i18n.packUrls` 外部语言包机制
  （切语言时懒加载、深合并、缺失时静默回退 `name`）—— 无需新增代码
- admin 只配 key，不在 iam 后台填双语文案（这是 i18nKey 方案的固有边界）

### R6 兼容与降级

- 未配 i18nKey 的既有菜单（`i18n_key` 为 null）行为完全不变：渲染 `name` 原文
- 语言包缺该 key 时回退 `name` 原文，不白屏、不报错
- 不改语言切换链路（`switchLocale` → 写 localStorage → 整页刷新 → 重拉菜单），
  切语言后菜单重新拉取并按新语言解析

### R7 mock 与测试同步

- `apps/iam-web/src/mocks/menu-handlers.ts`：种子菜单 + create/update handler 支持 i18nKey
- `apps/portal-web/src/mocks/handlers.ts` `mockRawMenus`：补 i18n_key 字段
- 新增/更新测试覆盖：edge fn 透传、iam 表单读写、portal transformMenu 映射 +
  `menuTitle()` 解析链路

## Out of Scope

- **不在 iam 后台直接编辑双语文案**（不引入 `name_zh`/`name_en` 列或 translations JSON 列）——
  已决策走 i18nKey 方案，译文由语言包维护
- **不改 `menuTitle()` 的解析语义**（`i18nKey` 优先、`name` 回退）
- **不引入新的 i18n 库或运行时**（i18next/react-i18next 已就位）
- **不改语言切换机制**（整页刷新链路的理由是后端按语言下发数据，本方案不引入后端语言分支）
- **不改 skills-web 子应用内部的静态中文文案**（市场页的分类/排序/卡片等硬编码文案，
  源码在 `apps/skills-web/src/pages/marketplace/data.ts`）—— 已按 D4 明确移出本次范围，
  留作后续任务

## Acceptance Criteria

- [x] AC1：`menus` 表存在 `i18n_key` 列（可空），迁移幂等可重复执行
      —— `0007_menu_i18n_key.sql`：`add column if not exists` + 回填带 `i18n_key is null` 守卫
- [x] AC2：iam edge fn 的 `GET /auth/menus` 与 `GET /menus/all` 响应包含 `i18n_key` 字段
      —— `MENU_COLUMNS` 加列，`toTree` 的 `{...node}` 展开自动透传
- [x] AC3：iam edge fn 的 `POST /menus` 与 `PUT /menus/:id` 接受并持久化 `i18nKey`（含 camelCase 入参）
      —— `parseMenuInput` 双形态解析（snake 优先）+ trim + 空串归 null
- [x] AC4：iam 菜单管理页可填写、编辑、保存 i18nKey，且表格可见该值
      —— 表单输入框 + 表格列 + `openEdit` 回填 + `submitForm` 提交
- [x] AC5：portal-web `transformMenu` 把接口的 `i18n_key` 映射到 `MenuItem.i18nKey`
      —— 主分支与 button 分支均映射；null → undefined
- [x] AC6：配了 i18nKey 且语言包有对应条目时，菜单标题按当前语言显示翻译
      —— 渲染期经既有 `menuTitle()`（未改动）；测试断言 en-US 下取 "Home"/"System"
- [x] AC7：未配 i18nKey 或语言包缺条目时，菜单标题回退接口原文 `name`
      —— `menuTitle` 三态语义（既有）；测试断言缺条目回退 name
- [x] AC8：切换语言（zh-CN ↔ en-US）后，侧边栏 / 面包屑 / tabbar 的菜单标题同步切换
      —— 走既有 `switchLocale` → 整页刷新 → 重拉菜单 → 按新语言解析（链路未改动）
- [x] AC9：seed 的 5 个导航节点回填 i18n_key，中英文切换后均显示对应语言
      —— 回填条件已对 0004 种子行逐条校验（各命中且仅命中 1 条）；
        5 个 key 在 zh-CN/en-US 内置包均已存在
- [x] AC10：既有无 i18n_key 的菜单在切语言后不报错、不显示空白
      —— `?? undefined` → 未配 → 回退 name；旧后端不返回该字段时同样安全
- [x] AC11：相关单元测试通过（iam-web / portal-web 两个包的 test 脚本）
      —— iam-web 60/60 通过；portal-web 191/191 通过；两包 tsc + build + lint 通过

## Key Decisions

- **D1：走 i18nKey 方案**（用户决策，2026-11-22）—— 菜单表存翻译键，译文放语言包；
  不采用 DB 双语列方案
- **D2：复用宿主既有 i18n 机制**（`menuTitle()` + `packUrls`），本次只补「数据到达消费点」
  这段链路，不新建并行机制
- **D3：`name` 保持必填**，继续作为回退原文 —— 存量数据零改动即可工作
- **D4：范围 = 仅 iam 后台配置的导航菜单**（用户决策，2026-11-22）—— skills-web
  子应用内部的静态中文文案（分类菜单 / 排序标签 / 卡片标签，
  `apps/skills-web/src/pages/marketplace/data.ts`）**不在本次范围**，留作后续任务。
  skills-web 目前没有 locales 目录，纳入意味着额外引入该应用的 i18n 运行时
- **D5：迁移只回填 seed 节点**（用户决策，2026-11-22）—— 0007 迁移给 seed 的 5 个
  导航节点回填 key（`menus.home` / `menus.system.title` / `menus.system.users` /
  `menus.system.menus` / `menus.system.roles`），对应内置语言包已有条目；
  后台手工建的节点（如 skills app 节点）留给 admin 自行补
- **D6：iam 表单用自由文本框**（用户决策，2026-11-22）—— 一个文本输入框 + placeholder
  说明点串格式；能填内置包以外的 key（第三方菜单走 packUrls 时必需）。
  代价：admin 可能填错而不自知（填错的 key 静默回退 name 原文）—— 见 R-1

## Risks / Deferred Items

- **R-1 键名写错静默回退**：admin 填了语言包里不存在的 key 时，界面无提示地显示
  `name` 原文（既有 `menuTitle` 语义）。缓解：iam 表单的 placeholder 说明格式；
  第三方菜单走 packUrls 时由语言包维护方保证 key 对齐
- **R-2 外部语言包依赖部署配置**：`packUrls` 未配置时第三方菜单只有中文 ——
  属既有机制的固有行为，不在本次修复范围
- **R-3 skills-web 内部静态文案的多语言**（分类菜单 / 排序 / 卡片标签等）——
  已按 D4 明确移出本次范围，留作后续任务（需给 skills-web 引入 locales + i18next 运行时）
- **R-4 后台已建节点的 i18nKey**（skills app 节点等）—— 按 D5 不回填，
  由 admin 在后台自行补 key；其译文走外部 packUrls 或后续扩展内置包

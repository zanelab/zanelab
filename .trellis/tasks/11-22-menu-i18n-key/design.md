# Design — 菜单 i18nKey 多语言链路

> 技术方案已由用户决策（D1：i18nKey 方案）。本文只锁定各层契约与实施边界，
> 不重复 PRD 的需求叙述。

## 1. 架构与边界

数据流（`→` = 数据流向，每一跳都是一个契约边界）：

```
DB menus 表 (i18n_key 列)
  → [edge fn] MENU_COLUMNS select → MenuRow.i18n_key
    → [edge fn] toTree() 展开透传 → 响应 JSON { ..., i18n_key }
      → [portal-web] RawMenuItem.i18n_key
        → [portal-web] transformMenu() → MenuItem.i18nKey
          → [portal-web] menuTitle() → i18nnext t(i18nKey, {defaultValue: name})
            → 侧边栏 / 顶栏 / 面包屑 / tabbar / 用户下拉框
```

旁路（写入链）：

```
iam 菜单管理页表单 (i18nKey 输入框)
  → menusApi.create/update (MenuInput.i18nKey)
    → [edge fn] parseMenuInput() → MenuInput.i18n_key
      → DB insert/update (i18n_key 列)
```

**边界责任：**

| 边界 | 职责 | 本次改动 |
|---|---|---|
| DB ↔ edge fn | snake_case 列名 ↔ snake_case 行字段 | `MENU_COLUMNS` 加列 |
| edge fn ↔ portal-web | 接口 JSON 原样透传（不翻译、不裁剪） | `RawMenuItem` 收 `i18n_key` |
| portal-web 内部 | snake → camel 归一 + 渲染期解析 | `transformMenu` 写 `i18nKey`；解析已就绪 |

**关键设计点：edge fn 不做语言分支。** 翻译发生在宿主渲染期，接口永远返回
`i18n_key` 原文与 `name` 原文，由客户端按当前语言二选一。这与既有
`menuTitle()` 的语义完全一致，也意味着：

- 接口响应**不随语言变化**（`/auth/menus` 的响应体在 zh/en 下结构相同）
- 语言切换走既有 `switchLocale()` → 整页刷新 → 重拉菜单 → 按新语言解析
- edge fn 的 `detectLang()` 只影响 `msg` 字段（错误提示），与菜单文案无关

## 2. 数据契约

### 2.1 DB 列

```sql
alter table public.menus
  add column if not exists i18n_key text;
```

- 可空、无默认值 → 既有行 `i18n_key IS NULL`，渲染回退 `name`（零行为变更）
- 不加索引：菜单表行数极小（导航节点个位数量级），`i18n_key` 无查询场景
- 不加 `not null`：`name` 已是必填的原文回退，i18nKey 天然可空

### 2.2 回填（0007 迁移内，只回填 seed 节点）

按 `permission` / `uri` 定位（比按 `name` 定位稳 —— name 可能被 admin 改过，
permission/uri 才是 seed 的稳定标识）：

| 节点 | 定位条件 | i18n_key |
|---|---|---|
| 首页 | `uri = '/home'` | `menus.home` |
| 系统管理 | `component = 'iam' AND type = 'app'` | `menus.system.title` |
| 用户管理 | `permission = 'system:user:list'` | `menus.system.users` |
| 菜单管理 | `permission = 'system:menu:list'` | `menus.system.menus` |
| 角色管理 | `permission = 'system:role:list'` | `menus.system.roles` |

回填写法用 `update ... where ... and i18n_key is null`（幂等：已填的值不覆盖）。
这 5 个 key 在 `apps/portal-web/src/locales/{zh-CN,en-US}.json` 的 `menus.*` 段
**已存在**，无需新增语言包条目。

button 节点（`system:menu:create` 等 6 个）不回填 —— 它们是权限码载体，
name 只在管理页表格/权限码提示里出现，不进宿主导航文案。

### 2.3 edge fn 契约

`MENU_COLUMNS`（当前：`id,pid,permission,name,component,uri,type,sort,icon,active_icon,hidden,scopes`）
→ 追加 `i18n_key`。**位置**：放在 `name` 之后，与 DB 列顺序一致。

`MenuRow` 加 `i18n_key: string | null`。

`MenuInput` 加 `i18n_key?: string | null`（snake_case，与该接口其余字段一致；
既有 `active_icon` 也是 snake —— 注意前端 `MenuInput` 用 camelCase，
edge fn 侧 `MenuInput` 用 snake，两侧不是同一个类型）。

`parseMenuInput` 双形态兼容（与既有 `active_icon`/`activeIcon` 同款）：

```ts
const rawI18nKey = body.i18n_key !== undefined ? body.i18n_key : body.i18nKey;
if (rawI18nKey !== undefined)
  input.i18n_key = rawI18nKey === null ? null : String(rawI18nKey).trim();
```

- 空串归一为 `null`（`''` 在 DB 里是「填了但没内容」，语义上等同未配 → 回退 name）
  —— **决策点**：本设计采用「空串 → null」。理由：表单提交时空 input 天然产出
  `''`，归一为 null 后 DB 状态干净（`is null` 而非 `''`），回填迁移的
  `and i18n_key is null` 守卫也能正确识别「未配」
- `trim()`：去掉 admin 误输入的首尾空格（`t()` 点串对空格敏感）

**类型矩阵不变**：`TYPE_FIELD_MATRIX` 不动 —— i18nKey 对 app/menu/group/button
四种类型都可填，按类型裁剪会引入无谓的规则复杂度。

### 2.4 iam-web 契约

`MenuItemRecord` 加 `i18nKey?: string | null`（camelCase —— iam-web 的
`MenuItemRecord` 已是 camelCase 形态，`mapActiveIcon` 负责 snake→camel 归一）。

`mapActiveIcon` 重命名为更通用的一层？—— **不重命名**：改函数名会牵动
`listAll` / `list` / `create` / `update` 四处调用与函数语义（它现在只映射
activeIcon）。做法：把该函数扩成同时映射 `active_icon` 与 `i18n_key`
的归一层，函数名改为 `mapRow`（或 `normalizeRow`），四处调用点同步改。
这是小范围重构，语义更准确（它本来就是「snake→camel 归一」而非「映射 activeIcon」）。

`MenuInput`（iam-web 侧）加 `i18nKey?: string | null`（camelCase —— 前端提交形态）。

**边界契约对齐**：前端发 camelCase `i18nKey` → edge fn `parseMenuInput`
双形态兼容收下 → 存 snake `i18n_key` → 读回时 iam-web 的 `mapRow`
转回 camel `i18nKey`。两侧各转一次，与 `activeIcon` 的既有处理完全同构。

### 2.5 portal-web 契约

`RawMenuItem` 加 `i18n_key?: string | null`（snake —— 接口原样透传，
portal-web 不做 snake→camel 的通用归一，只在 `transformMenu` 里显式映射）。

`transformMenu` 两处构造 `item`：
- `button` 分支（`apps/portal-web/src/api/menu.ts:110` 附近）：加 `i18nKey`
- 主分支（`:145` 附近）：加 `i18nKey`

`i18nKey: raw.i18n_key ?? undefined` —— `null` → `undefined`（`MenuItem.i18nKey`
是可选字段，`undefined` 语义为「未配」；`menuTitle()` 的判断是
`menu.i18nKey ? ... : menu.name`，`null`/`undefined`/`''` 三者行为一致）。

**渲染期零改动**：`menuTitle()`（`apps/portal-web/src/locales/i18n.ts:165`）
已经实现 `i18nKey` 优先、`name` 回退。侧边栏 / 顶栏 / 面包屑 / tabbar /
用户下拉框全部已走它。

## 3. 翻译内容来源

| 场景 | 来源 | 已有机制 |
|---|---|---|
| seed 5 节点 | 内置包 `menus.*` 段 | 已存在，无需新增 |
| 后台新建的菜单 | 内置包扩展 or 外部 `i18n.packUrls` | `loadMessagePack()` 已实现懒加载深合并 |
| 第三方菜单 | 外部 `i18n.packUrls` | 同上 |

`packUrls` 的懒加载在切语言时触发（`usePreferencesStore.subscribe` →
`loadMessagePack(locale)`），加载完成后补发 `languageChanged` 驱动重渲染。
**本次不改动这条链路**。

## 4. 兼容性与迁移

| 场景 | 行为 |
|---|---|
| 存量菜单（`i18n_key` null） | 渲染 `name` 原文，行为与本次改动前完全一致 |
| 已配 key 但语言包缺该 key | `t(key, {defaultValue: name})` → 回退 `name`，不白屏不报错 |
| 已配 key + 语言包有 | 按当前语言显示翻译 |
| 表单提交空 i18nKey | `''` → edge fn 归一为 `null` → DB 存 null |
| 迁移重复执行 | `add column if not exists` + `update ... and i18n_key is null` → 幂等 |
| 回填后 admin 改了 key | 回填的 `is null` 守卫不覆盖已有值 → admin 的修改保留 |

**回滚**：删列会丢 admin 已配的 key —— 故不提供自动回滚脚本；
若需回滚，代码层回退（字段变可选，接口不返回时前端行为等同 null）即可，
DB 列残留无害。

## 5. 重要取舍

1. **edge fn 不做语言分支**（vs 后端按 `x-client-info` 返回已翻译的 `name`）
   —— 取舍点：后端翻译则接口响应随语言变化，需要缓存失效策略，且失去
   客户端语言包的统一治理。既有 `menuTitle()` 已是渲染期解析，遵循它。

2. **i18nKey 与 name 都存**（vs 只存 i18nKey）
   —— 只存 i18nKey 会让「语言包缺 key」的节点显示 key 字符串本身（i18next
   的 defaultValue 行为），而 `name` 存原文能给出可用的兜底。

3. **表单用自由文本框**（vs 下拉选择）—— 用户决策 D6。下拉会堵死
   内置包外的 key（第三方菜单场景必需）。

4. **`mapActiveIcon` 改名 `mapRow`** —— 小范围重构，但让「snake→camel 归一」
   的职责名副其实。若认为改名收益不足，可保留原名只扩功能 ——
   **实施时的可选项**。

## 6. 测试策略

| 层 | 测试点 | 位置 |
|---|---|---|
| edge fn | `parseMenuInput` 收 camel/snake 双形态；空串归一 null；`MENU_COLUMNS` 含 i18n_key | edge fn 无既有测试目录 → 靠类型检查 + 手工验证 |
| iam-web | `mapRow` 归一；表单 state 往返；create/update 请求体含 i18nKey | `src/api/menus.test.ts`（既有）+ `MenuManagementPage.test.tsx`（既有） |
| portal-web | `transformMenu` 映射 i18n_key → i18nKey；`menuTitle()` 解析链路 | `src/locales/i18n.test.ts`（既有，含 menuTitle 断言）+ menu api 测试 |

edge fn 侧无既有测试基建（`supabase/functions/iam/index.ts` 是单文件 1429 行，
无测试目录）—— 本次不新建 edge fn 测试体系，靠 `tsc` 类型检查 +
mock 契约覆盖 + 人工联调验证。

## 7. 运维与回滚

- 迁移 `0007` 在 `apps/iam-web/supabase/migrations/` 下，与既有 0001-0006 同目录，
  按序执行
- **部署顺序**：DB 迁移 → edge fn 部署 → 前端发布。
  反序部署时：新前端读 `i18n_key`（列不存在则接口不返回该字段 → 前端
  `raw.i18n_key ?? undefined` → undefined → 回退 name，行为安全）；
  新 edge fn 对无列的库执行 select 会报错 —— **故 edge fn 必须最后部署**，
  或迁移先行

# 国际化（i18n）

> tq-portal 双语（zh-CN / en-US）运行时约定。**新增任何用户可见文案前先读本文。**

## 运行时与语言包组织

- i18next + react-i18next，初始化在 `src/locales/i18n.ts`（单一实例、单 namespace `translation`、`fallbackLng: 'zh-CN'`、`escapeValue: false`）。
- 语言包：`src/locales/zh-CN.json` 与 `src/locales/en-US.json`，**两包 key 树必须完全一致**（key 树比对脚本见下「新文案入包流程」）。
- key 用嵌套对象，不用扁平点串；后端下发的 `i18nKey` 天然是点串（如 `menus.system.users`），与嵌套结构直接对应。
- 初始语言读 preferences store 的 `app.locale`（persist），不硬编码。

### 命名段约定

| 段 | 归属 |
|------|------|
| `common` | 跨域通用（返回/取消/关闭/确认/暂无数据/刷新 + `common.http.*` 错误文案） |
| `auth` | 认证表单与认证页（`auth.validation.*`、`auth.login.*`、`auth.layout.*` 等） |
| `preferences` | 偏好设置抽屉全部（blocks/主题/布局/tabbar/快捷键/通用/动画） |
| `demo` | 演示页（button/table） |
| `pages` | 本地页面标题与占位文案（dashboard/profile/403/404/未注册组件） |
| `widgets` | 壳 widget 文案（notification/lock-screen/search/timezone/header/user-dropdown/`widgets.tabbar.contextMenu.*` 标签右键菜单） |
| `menus` | 后端菜单 i18nKey 对应的菜单名（`menus.system.users` 等） |

## 消费方式（二选一，不混用）

- **组件内**（有 React 上下文）：`const { t } = useTranslation();` → `t('auth.login.title')`。插值用 `t('auth.codeLogin.resendIn', { count: n })`。
- **组件外工具函数**（http.ts 拦截器、generateRoutes.tsx 等非 React 上下文）：`import i18n from '../locales/i18n'` → `i18n.t('common.http.networkError')`。
- 带 t 的校验 schema 用工厂函数（`const buildLoginSchema = (t: TFunction) => z.object({...})`），提交时重建，让校验消息跟随当前语言；模块顶层不落带文案的 schema。
- 模块顶层的选项数组（下拉/单选）只存 value/icon，label 在渲染期 `t()` 解析（模板 key：`` t(`preferences.header.modes.${item.value}`) ``）。

## 菜单多语（MenuItem.i18nKey 契约）

- `MenuItem.i18nKey?: string`（`src/types/index.ts`）——后端菜单下发的语言包点串；`name` 是回退原文。
- 渲染统一走 `menuTitle(menu)`（`src/locales/i18n.ts`）：**三态语义**——
  1. 无 `i18nKey` → 直接用 `name`（存量数据零影响）；
  2. 有 key 但语言包缺条目 → `defaultValue: name` 回退原文；
  3. 有 key 且命中 → 翻译。
- 消费点：`menu-views.ts`（侧边栏/顶栏/搜索/用户下拉框）、tabbar（`use-tabbar` 渲染期解析，store 只存 `name`/`i18nKey` 原始值）、面包屑。**菜单 store 不动**——仍存全量原始契约，翻译在渲染期解析，menuType 分流不变式不受影响（见 [状态管理](./state-management.md)）。
- 非 hook 上下文的 menuTitle 调用链（menu-views 纯函数）靠 **App.tsx 装配层的 `useTranslation()`** 驱动重渲染；`use-tabbar` 的 useMemo 依赖需含 `i18n.language`。

## Scenario: 菜单 i18nKey 跨层链路（iam 配置 → /auth/menus → 宿主渲染）

> **触发**：改菜单多语言、加菜单字段、或「admin 在后台配了 key 但界面没翻译」时读本文。
> 链路是 2026-11-22（任务 11-22-menu-i18n-key）打通的——此前宿主渲染机制齐备，
> 但后端从不下发该键，`menuTitle` 的第三态永远走不到。

### 1. Scope / Trigger

跨 4 层的契约变更：DB 列 → Edge Fn → 宿主 API 层 → 宿主渲染。
**任一层漏改 = 键到不了消费点**（且不报错，只是静默回退 `name`）。

### 2. Signatures

| 层 | 位置 | 契约 |
|---|---|---|
| DB | `apps/iam-web/supabase/migrations/0007_menu_i18n_key.sql` | `menus.i18n_key text`（可空、无默认值） |
| Edge Fn | `apps/iam-web/supabase/functions/iam/index.ts` | `MENU_COLUMNS` 含 `i18n_key`；`MenuRow.i18n_key`；`MenuInput.i18n_key` |
| iam api | `apps/iam-web/src/api/menus.ts` | `MenuItemRecord.i18nKey: string \| null`；`MenuInput.i18nKey?: string \| null`；`mapRow()` 归一 |
| 宿主 api | `apps/portal-web/src/api/menu.ts` | `RawMenuItem.i18n_key?: string \| null`；`transformMenu()` → `MenuItem.i18nKey` |
| 宿主渲染 | `apps/portal-web/src/locales/i18n.ts` | `menuTitle(menu)` —— **已存在，本次未改** |

### 3. Contracts

**读链路**（逐跳格式）：

```
DB i18n_key (snake)
  → edge fn MENU_COLUMNS select → MenuRow.i18n_key
  → 响应 JSON { ..., i18n_key }        ← 原样透传，edge fn 不做语言分支
  → portal RawMenuItem.i18n_key
  → transformMenu → MenuItem.i18nKey   ← null → undefined（= 未配）
  → menuTitle() → i18nnext t(key, {defaultValue: name})
```

**写链路**：

```
iam 表单 i18nKey（camel）
  → MenuInput.i18nKey
  → edge fn parseMenuInput（双形态：snake 优先，缺失取 camel）
  → trim → 空串归 null → 存 DB i18n_key
```

**关键约定**：

- **edge fn 不做语言分支**：接口响应**不随语言变化**（`detectLang` 只影响 `msg`）。
  翻译在宿主渲染期发生 → 切语言走既有 `switchLocale` → 整页刷新 → 重拉菜单 → 按新语言解析。
- **`name` 保持 `not null` 且继续是回退原文**——存量数据零改动即可工作。
- **iam api 层双形态归一**：线上 edge fn 返回 snake_case，独立态 mock 持有 camelCase。
  `mapRow` 用 `snake ?? camel ?? null` 接住两种来源（与既有 `activeIcon` 同款）。
- **button 节点也映射 i18nKey**——其 `name` 同样进菜单文案展示点。

### 4. Validation & Error Matrix

| 条件 | 行为 | 是否有提示 |
|---|---|---|
| `i18n_key` 为 null / 未配 | 渲染 `name` 原文 | 无（正常态） |
| 语言包缺该 key | `defaultValue: name` 回退原文 | 无（正常态） |
| 表单提交空串 / 纯空格 | edge fn 与 mock 均 trim → null | 无 |
| admin 填了语言包里不存在的 key | 静默回退 `name` 原文 | **无** —— 已知的 UX 缺口（见「反面模式」） |
| 后端未部署新版本（响应无该字段） | `raw.i18n_key ?? undefined` → 未配 → 回退 `name` | 无（安全降级） |

### 5. Good / Base / Bad Cases

- **Good**：admin 在菜单管理页填 `menus.system.users` → 保存 → 宿主切到 en-US 显示 "Users"。
- **Base**：既有菜单未配 i18nKey → 切语言后仍显示 `name` 原文，不报错、不空白。
- **Bad**：admin 填 `menu.system.users`（少个 s）→ 界面无提示地显示中文原文 → 排查时
  **先查键名与语言包是否对得上**，而不是怀疑渲染层。

### 6. Tests Required

- `apps/iam-web/src/api/menus.test.ts` —— i18nKey 随 list 读回（camelCase 归一）、
  create 带键落库、不带键 → null、空串 → null、update 清空 → null。
- `apps/iam-web/src/pages/MenuManagementPage.test.tsx` —— 表单填 i18nKey 提交后
  表格列展示该键。
- `apps/portal-web/src/api/menu.test.ts` —— `i18n_key` → `MenuItem.i18nKey` 映射
  （含 button 分支）、null → undefined、映射结果可被 `menuTitle` 消费。
- 语言包两包 key 树必须一致（见「新文案入包流程」的比对脚本）。

### 7. Wrong vs Correct

#### Wrong

```ts
// ❌ 在 edge fn 里按语言返回已翻译的 name —— 响应随语言变化，
//    破坏「接口是语言无关的公共数据」前提，且失去客户端语言包统一治理
const name = lang === 'zh-CN' ? row.name : translate(row.i18n_key);
```

#### Correct

```ts
// ✅ 接口原样透传键与原文，翻译在宿主渲染期发生
// edge fn: MENU_COLUMNS 含 i18n_key，响应带 i18n_key + name
// portal transformMenu:
i18nKey: raw.i18n_key ?? undefined,
// portal 渲染:
menuTitle(menu); // 有 key 命中→翻译；缺条目→回退 name；无 key→name
```

## 切语言链路（单点）

- 唯一切换入口：`preferences store 的 app.locale`（语言下拉只写 preferences，不直接调 changeLanguage）。
- `src/locales/i18n.ts` 末尾的 `usePreferencesStore.subscribe` 单点订阅：locale 变化 → `i18n.changeLanguage(locale)` + `document.documentElement.lang` 同步。
- qiankun 全局状态快照含 locale 维度，语言变化推送给子应用（「无变化不推送」语义，见 [微前端与子应用](./microfrontend-guidelines.md)）。
- 语言持久化由 preferences store 的 zustand persist 承担（`admin-preferences`），整页刷新后 i18n init 读回。

## 子应用接入 i18n（qiankun 子应用模板，11-23-skills-i18n-radius）

> 新子应用要接多语言时**平移 iam/skills 版**，不重写。两处已验证的落地：
> `apps/iam-web/src/locales/i18n.ts`、`apps/skills-web/src/locales/i18n.ts`（逐行同构，仅命名/注释差异）。

**运行时四件套**（`src/locales/i18n.ts` 公开 API，签名对齐宿主同款）：

- `resolveXxxLocale(locale?)`：normalizeLocale 归一（@zanelab/utils，`zh_CN`/`zh-CN` 都认）→ 未命中 null
- `setupI18n(propsLocale?)`：mount/独立态两入口统一调用；`isInitialized` 分支只对齐语言不重复 init（i18next 二次 init 丢 resources 订阅）
- `setLocale(locale?)`：唯一切换入口；**同值 no-op**（宿主快照是全量推送，locale 未变不得触发 changeLanguage）+ `<html lang>` 同步 + packUrls 懒加载触发
- `injectMessagePacks(urls)` / `loadMessagePack(lng)`：外部语言包懒加载（props.i18n.packUrls 下发；先标记再 fetch，失败 console.warn 降级内置，加载后对当前语言补发 `languageChanged` 驱动 t() 直调点重渲染）

**main.tsx 接线三要点**（iam main.tsx `setupLocale`/`setupHostAssets` 同款）：

1. mount 里 `setupLocale(getProps())`（初始语言 + onHostStateChange 订阅）→ **unmount 必须 `unsubscribeLocale?.()`**（重复挂载订阅累积）
2. 独立态分支也要调 `setupI18n()`（无参 → 缺省 zh-CN）——t() 必须有实例，否则组件渲染 key 字符串
3. **组件不得 import main.tsx**（qiankun 入口在 jsdom 与 vite-plugin-qiankun 冲突）——i18n 模块独立于入口，测试直接 import

**测试接线**：`src/test/setup.ts` 全局 `setupI18n()`（缺省 zh-CN）——既有用例的
中文文案断言不改即过（译文与原硬编码逐字一致是文案抽取的验收标准）。
已知顺序细节：mount 里 `setupI18n`（拉初始语言包）先于 `injectMessagePacks`
（注入 URL 表）→ 首次 mount 外部包静默跳过。iam/skills 均如此（内置包覆盖
全部文案时无影响）；子应用有第三方 i18nKey 时应交换两个调用的顺序。

## 新文案入包流程

1. zh-CN 用现文案建 key，en-US 同步补翻译（同一改动内两包一起改，不留「先中文后补英文」的中间态）。
2. 跑 key 树比对，两包 diff 必须为空：
   ```bash
   python3 -c "
   import json
   def kt(o,p=''):
       return set().union(*(kt(v,f'{p}.{k}') if isinstance(v,dict) else {f'{p}.{k}'} for k,v in o.items()))
   zh=kt(json.load(open('src/locales/zh-CN.json'))); en=kt(json.load(open('src/locales/en-US.json')))
   print('zh:',len(zh),'en:',len(en),'diff:',zh^en)"
   ```
3. DOM 属性文案（`placeholder`/`title`/`aria-label`）同样入包，不允许硬编码中文属性值。

## 刻意保留清单（不算残留）

- **语言自称 endonym**：语言选项显示母语名（`简体中文`/`English`），两种语言下均不翻译——惯例，用户靠母语名识别自己的语言。
- **mock/数据字段**：demo 页 mock 数据（昵称、status 值）与 MSW `handlers.ts` 的 `msg` 字段是数据不是 UI 文案，不入包；status 之类的枚举值在**展示层**按值分支译（`row.status === '启用' ? t('demo.table.enabled') : ...`）。
- **中文注释**：代码注释一律不翻译。

## 反面模式

- 在组件里 `import i18n from '../locales/i18n'` 直调 t——组件内必须走 `useTranslation()`（否则语言切换不触发重渲染）。
- 语言包里存 JSX/HTML——语言包只放纯文案（emoji 可以）。
- 绕过 preferences 直接调 `i18n.changeLanguage`——会脱离 persist 与 qiankun 同步链路。
- tabbar/持久化结构里存**解析后的翻译**——必须存原始 `name`/`i18nKey`，渲染期解析。
- **在 edge fn 里按 `detectLang` 返回已翻译的 `name`**——菜单接口必须是语言无关的公共数据，
  翻译统一在宿主渲染期（见「Scenario: 菜单 i18nKey 跨层链路」）。
- **只改 `MENU_COLUMNS` 就以为链路通了**——`MenuRow`/`MenuInput`/`parseMenuInput`/
  iam api 的 `mapRow`/宿主 `transformMenu` 五处都要改，漏一处则键静默消失
  （表现为「配了 key 但不翻译」）。
- **给 i18nKey 做「下拉选已有 key」**——会堵死内置包外的键（第三方菜单走
  `i18n.packUrls` 时必需）；用自由文本框 + placeholder 说明格式。

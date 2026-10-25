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

## 切语言链路（单点）

- 唯一切换入口：`preferences store 的 app.locale`（语言下拉只写 preferences，不直接调 changeLanguage）。
- `src/locales/i18n.ts` 末尾的 `usePreferencesStore.subscribe` 单点订阅：locale 变化 → `i18n.changeLanguage(locale)` + `document.documentElement.lang` 同步。
- qiankun 全局状态快照含 locale 维度，语言变化推送给子应用（「无变化不推送」语义，见 [微前端与子应用](./microfrontend-guidelines.md)）。
- 语言持久化由 preferences store 的 zustand persist 承担（`admin-preferences`），整页刷新后 i18n init 读回。

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

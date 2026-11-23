# Design — 子任务① skills-web i18n + radius 主题联动

> 模板来源：`apps/iam-web/src/locales/i18n.ts`（i18n 运行时）+
> `apps/iam-web/src/pages/MenuManagementPage.tsx:113-123`（radius 派生）。
> 平移而非新造——两处已在 iam-web 验证过（qiankun 沙箱独立实例、jsdom 测试、
> 独立态缺省）。

## 1. 架构与边界

```
宿主 portal-web（已有，零改动）
  props.preferences.locale ──┐
  props.onHostStateChange ───┤→ skills-web main.tsx 接线
  props.i18n.packUrls ───────┘     ├─ setupI18n(locale)  （mount，一次）
                                   ├─ injectMessagePacks(packUrls)
                                   └─ onHostStateChange 订阅 → setLocale（运行期）

skills-web 新增：
  src/locales/i18n.ts    ← i18next 运行时（iam 同款轻量版）
  src/locales/zh-CN.json / en-US.json
  src/pages/marketplace/*  ← 消费：useTranslation() / t()
```

**与宿主的契约**（register.ts 已实现，本任务只消费）：

- `props.preferences`：getter，mount 时取 store 最新值
- `props.onHostStateChange(listener)`：返回取消订阅函数；快照含 preferences
  （SubAppPreferences：mode/colorPrimary/**radius**/fontSize/locale/…）
- **skills-web 不读宿主 config.js**——语言包 URL 经 `props.i18n.packUrls` 注入
  （iam 同款；子应用不读宿主 config 是跨应用边界约定）

## 2. i18n 运行时（src/locales/i18n.ts）

以 iam 版为模板，差异点只有三处（其余逐行平移）：

1. `SUPPORTED` / FALLBACK 相同（'zh-CN' / 'en-US'，缺省 zh-CN）
2. 资源 import 路径、模块注释里的「iam」字样换成 skills
3. **无 `SubAppPreferences` 全量依赖**——`resolveSkillsLocale` 只吃 string

```ts
// 公开 API（与 iam 同名同义，测试可平移）：
export function resolveSkillsLocale(locale?: string): 'zh-CN' | 'en-US' | null
export function setupI18n(propsLocale?: string): void   // mount 调；幂等（isInitialized 分支）
export function setLocale(locale?: string): void        // 订阅回调调；同值 no-op
export function injectMessagePacks(urls: Record<string,string>): void
export async function loadMessagePack(lng: string): Promise<void>
export function __resetMessagePacksForTest(): void
export default i18n
```

**关键行为（iam 已验证，注释随代码平移）：**

- `setupI18n` 二次调用（qiankun 复挂载）只对齐语言不重复 init
- `setLocale`：`resolveSkillsLocale` 未命中或与当前同值 → no-op
  （宿主快照是全量推送，locale 未变不得触发重渲染）
- `loadMessagePack`：先标记再 fetch（并发只拉一次）；失败 console.warn 静默
  降级内置文案；加载后对当前语言补发 `languageChanged` 驱动 t() 直调点重渲染

## 3. main.tsx 接线

```tsx
// mount：
setProps(props as SkillsProps);
setupI18n((props.preferences as { locale?: string } | undefined)?.locale);
injectMessagePacks((props.i18n as { packUrls?: Record<string,string> } | undefined)?.packUrls);
unsubscribeLocale = subscribeLocaleFromProps(props);  // 见下

// unmount：unsubscribeLocale?.(); 取消订阅 + setProps({})（既有）
// 独立态直渲分支：render({ basename: '/' })——无 preferences → setupI18n 不被调？
//   不对：独立态也要 i18n（t() 必须有实例）。独立态调 setupI18n()（undefined → 缺省 zh-CN）。
```

`subscribeLocaleFromProps(props)`（main.tsx 内小函数，模式同 iam main.tsx:34-38）：

```ts
if (typeof props.onHostStateChange !== 'function') return () => {};
return props.onHostStateChange((state) => {
  const prefs = state.preferences as { locale?: string } | undefined;
  setLocale(prefs?.locale);   // setLocale 自带同值 no-op
});
```

**jsdom 约束（iam 已踩坑，直接沿用）**：props.ts 类型 + 模块级状态无副作用；
组件不得 import main.tsx（qiankun 入口在 jsdom 下冲突）——i18n 模块独立于入口，
测试直接 import locales/i18n。

## 4. 语言包组织

key 段规划（两包 key 树一致；比对脚本在 check 阶段跑）：

```jsonc
{
  "skills": {
    "market": { "title": "...", "countSuffix": "个 Skills", "searchPlaceholder": "...", "filter": "筛选", "expandFilter": "展开筛选", "collapseFilter": "收起筛选" },
    "toolbar": { "category": "分类", "search": "搜索", "upload": "上传 Skills", "uploadTitle": "..." },
    "sort": { "recommended": "推荐", "latest": "最新发布", "popular": "热门", "rating": "评分最高" },
    "group": { "free": "...", "featured": "...", "scene": "...", "role": "...", "output": "...", "agent": "..." },
    "option": { /* 24 个筛选选项 label，按 <group>.<value> 嵌套或平铺 */ },
    "card": { "free": "免费", "downloads": "下载", "bookmarks": "收藏", "compatible": "兼容", "rating": "评分" },
    "footer": { "overview": {...}, "faq": {...}, "browse": {...}, "links": {...} },
    "upload": { "title": "...", "close": "关闭", "submit": "...", "body": "..." }
  }
}
```

**data.ts 改造原则（i18n-guidelines「选项数组」规范）：**

- `FILTER_GROUPS`：`title: string` → `titleKey: string`（或删除字段，渲染期
  `t(`skills.group.${id}`)`——**采用后者**：key 由 id 派生，data.ts 不存文案）
- options 的 `label: string` → 渲染期 `t(`skills.option.${group}.${value}`)`；
  data.ts 只留 value/icon/count
- `SORT_OPTIONS`：label 删除，渲染期 `t(`skills.sort.${value}`)`
- `AGENT_LABEL`：**保留原文**（品牌名/数据，不翻译——spec 刻意保留清单同类）
- **消费点影响**：category-menu / filter-sidebar / sort-tabs 的 label 渲染处
  改 t()；filters.ts 纯函数只认 value，零改动

**outputTypes 值域（'网页' 等）**：值本身是中文——作为**数据键**保留中文值
（DB/接口值域稳定），展示层按值分支译：`t('skills.outputType.网页')` 换成
以 value 为 key 的映射（key 用拼音/英文 slug 更稳，design 决策：outputTypes
的展示 key 用 `skills.outputType.web|slides|video|image`，data.ts 加
`OUTPUT_TYPE_KEY: Record<OutputType, string>` 映射——值域中文是数据、key 是文案）。

## 5. radius 联动

**派生模式**（iam MenuManagementPage:113-123 同款，marketplace.tsx 内）：

```tsx
const prefs = {
  radius: '0.5',
  ...(props.preferences as Record<string, unknown> | undefined),
} as { radius?: string };
const pageRadius = `${prefs.radius}rem`;

<div style={{ '--page-radius': pageRadius } as CSSProperties}>...</div>
```

**落点清点（rounded-2xl/3xl/[20px] 的大容器 → rounded-(--page-radius)）**：
实施时 grep `rounded-(2xl|3xl|\[2[0-9]px\])` 逐一判定：

- 改：技能卡片外框、分类弹层面板（rounded-[20px]）、右侧 tabpanel、
  侧栏分组容器、footer 卡片、上传弹窗 modal-box
- 不改：胶囊控件（rounded-full 固定）、图标小方块（size-8 rounded-[9px]
  等装饰性小圆角——跟主题圆角联动会让小图标变形成球，保持固定）

**props.preferences 缺省**：独立态无 preferences → spread 空对象 → radius '0.5'。
mode/colorPrimary 等其余字段本任务不消费（skills 集成态样式由宿主注入主题，
色彩已随宿主；只缺 radius 这一维度）。

## 6. 测试策略

| 项 | 位置 | 断言点 |
|---|---|---|
| locale 归一/缺省 | src/locales/i18n.test.ts（新建） | resolveSkillsLocale 各形态；setupI18n 幂等；setLocale 同值 no-op |
| packUrls 懒加载 | 同上 | iam i18n.test.ts 的 packUrls 用例平移 |
| radius 派生 | marketplace.test.tsx（扩） | 无 props → 0.5rem；props 注入 → 跟随；胶囊仍 rounded-full |
| 文案渲染 | marketplace.test.tsx（既有用例改） | 中文断言改按 key/译文；切语言重渲染 |
| 回归 | 全量 vitest | 84 用例不回归（文案断言同步处） |

## 7. 回滚

纯前端改动，回滚 = revert 提交。无 DB/接口契约变更。

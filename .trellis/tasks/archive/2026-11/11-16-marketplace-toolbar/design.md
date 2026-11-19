# 设计：市场页工具栏（筛选 / 搜索 / 分类 + 上传入口）

[PRD](./prd.md)｜父任务 [PRD](../11-14-skills-marketplace-refactor/prd.md)｜
参考站证据 [`research/reference-skillry-marketplace.md`](../11-14-skills-marketplace-refactor/research/reference-skillry-marketplace.md)

## 架构与边界

| 文件 | 改动性质 |
|---|---|
| `marketplace.tsx` | 标题块拆出独占一行；控件区改左右两栏；接搜索与分类态 |
| `toolbar/`（新增目录） | `category-menu.tsx`（分类下拉）、`search-input.tsx`（搜索框）、`upload-button.tsx`（上传入口） |
| `modal/upload-placeholder.tsx`（新增） | 上传占位对话框 |
| `permission.ts`（新增） | 权限存储 + 订阅 + 判定（模块级，非 React） |
| `components/permission.tsx`（新增） | `<Permission code>` 组件（读上者的数据源） |
| `use-permissions.ts`（新增） | `useSyncExternalStore` 绑定，供组件消费 |
| `filters.ts` | 新增 `searchSkills`；`filterSkills` 增加 `agent` 分支（按组 id 分派） |
| `data.ts` | `id` 联合类型加 `'agent'`；新增「按 Agent」组；`AGENT_LABEL` 从 `skill-card.tsx` 迁入（消除第二份事实源） |
| `filter-sidebar.tsx` | 渲染新增的「按 Agent」组（`FILTER_GROUPS` 驱动，无需特判） |
| `skill-card.tsx` | 仅改为从 `data.ts` 导入 `AGENT_LABEL`（去掉本地那份） |
| `main.tsx` | `SkillsProps` 加 `permissions` / `onHostStateChange`；更新"无鉴权"注释 |
| `marketplace.test.tsx` / `filters.test.ts` | 补用例；既有行为契约断言不动 |
| `index.css` | **不改**（零 token 改动） |

## 参考站 → daisyUI 语义类名转译（工具栏与下拉）

延续 11-14 的转译原则：**保留结构、层级与节奏，把颜色表达式换成 daisyUI 语义色**。

| 位置 | 参考站 | 本项目落地 | 说明 |
|---|---|---|---|
| 全页遮罩 | `bg-background/70 backdrop-blur-[3px] saturate-[0.8]` | `bg-base-200/70 backdrop-blur-[3px] saturate-[0.8]` | `--background` 对位 `base-200`（页面底色）；两者都随主题翻转，**不需要固定色** |
| 弹层容器 | `rounded-[20px] border border-black/8 bg-popover` | `rounded-[20px] border border-base-300 bg-base-100` | `popover` 对位 `base-100` |
| 弹层阴影 | `shadow-[0_28px_80px_rgba(18,19,19,0.18)]` | `shadow-2xl` | 用既有语义阴影，不引入任意色值 |
| 左栏容器 | `rounded-2xl bg-muted p-1.5` | `rounded-2xl bg-base-200 p-1.5` | `muted` 对位 `base-200` |
| 左栏选中项 | `bg-card shadow-[0_1px_0_…,0_6px_16px_…]` | `bg-base-100 shadow-sm` | `card` 对位 `base-100` |
| 左栏未选中 | `hover:bg-card/60` | `hover:bg-base-100/60` | — |
| 右栏面板 | `rounded-2xl border border-black/[0.045] bg-muted/60` | `rounded-2xl border border-base-300 bg-base-200/60` | — |
| 条目 | `h-11 rounded-xl border border-black/[0.05] bg-card/72` | `h-11 rounded-xl border border-base-300 bg-base-100/70` | — |
| 条目 hover | `hover:border-black/[0.12] hover:bg-card hover:shadow-[…]` | `hover:border-base-content/20 hover:bg-base-100 hover:shadow-sm` | — |
| 条目图标位 | `img.size-8.rounded-[9px].ring-1.ring-black/5` | `size-8 rounded-[9px] ring-1 ring-base-300` + 语义色底 + `<AppIcon>` | 无真实图；延续 D3 |
| CTA 按钮 | `bg-[#f4ff71]` 黄绿胶囊 | **不实现**（见 PRD Out of Scope） | — |

弹层进出场（`scale-90 → 1` + 淡入，0.35s，`cubic-bezier(0.22,1,0.36,1)`）用 Tailwind
`transition-[opacity,scale]` + 四相位状态机（closed / entering / open / closing）实现：
进场在挂载首帧渲染 start 态类（`opacity-0 scale-90`），`useLayoutEffect` 读一次几何信息
强制结算 start 样式后翻转终态类（两次样式变更之间才会启动 transition；entering 相位挂
`transition-none`，堵住 daisyUI 的 `@starting-style` 抢跑）；出场保留挂载并切回 start 态类
播反向过渡、350ms 定时后卸载（定时器在 effect cleanup 清理，关→快速重开不串台）。
closing 相位以 utilities 层的 `opacity-0`/`scale-90`/`block` 压过 daisyUI 的 `:focus-within`
展示与 `display:none` 关闭规则（层序稳定压制），`inert` + `pointer-events-none` 切断交互；
`animate-none` 压制 daisyUI 自带的 0.2s 纯淡入 keyframe；全部过渡参数挂 `motion-safe:`
前缀，`prefers-reduced-motion` 下退化为无动画。

## 组件选型（已按 daisyUI 组件发现协议读过指南）

| 需求 | 候选 | 选定 | 依据 |
|---|---|---|---|
| 分类下拉弹层 | `megamenu` / `dropdown` / 自拼 | **`dropdown`** | `components/megamenu.md` 明确它是"用于页面顶部的**一个**大号水平菜单，每个条目各开一个 popover"，且**必须**含 `megamenu-active` 指示条、最多 10 个 popover、大屏显示小屏隐藏——与本例「工具栏里一个按钮开一个大面板」不符。`components/dropdown.md` 允许任意内容："The content is not limited to `<ul>`. It can be a different HTML element."，且提供受控用的 `dropdown-open` 修饰符 |
| 全页遮罩 | 无 daisyUI 组件 | **Tailwind 拼** | usage 规则 4："If daisyUI does not have an applicable component, make a component with Tailwind CSS utilities." |
| 搜索框 | `input` | **`input` 加在外层 label** | `components/input.md`："If the input contains more than one element, use the `input` class on the parent element."——框内要放前置图标，故 `input` 类写在 `<label>` 上 |
| 上传对话框 | `modal`（dialog / popover / checkbox） | **`modal` + `<dialog>` + `showModal()`** | `components/modal.md`："If possible, use the HTML `dialog` element"；`<dialog>` 自带焦点陷阱与 Esc 关闭 |
| 分组切换 | `tab` / `join` / 自拼 | **自拼（沿用既有 SortTabs 做法）** | 排序胶囊已用 `role=tablist`+`role=tab`+`aria-selected` 承载语义；`tabs-box` 的方框分组样式与参考站的圆角竖排不合（与 11-14 同一判断） |
| 按钮 | `btn` | **`btn`** | 用默认变体；`primary` 名额仍归卡片「免费」徽章 |

## 权限通路设计（本任务唯一的跨层契约变更）

### 契约

宿主已提供（`register.ts`，无需改动宿主）：

```ts
// props 上的 getter，single-spa 每次 mount 经 Object.assign 取值 → 挂载时快照
get permissions(): string[]           // useMenuStore 的权限码数组
onHostStateChange(snapshot)           // snapshot.permissions 在菜单重算时推送
```

skills-web 侧新增消费：

```ts
export interface SkillsProps {
  container?: HTMLElement;
  setHasRender?: (v: boolean) => void;
  /** 宿主注入的权限码；**非数组即视为无宿主**（独立态） */
  permissions?: string[];
  /** 宿主状态推送；订阅它以消除"挂载早于菜单加载 → 权限为空"的竞态 */
  onHostStateChange?: (snapshot: { permissions?: string[] }) => void;
  [key: string]: unknown;
}
```

### 判定规则（单一函数，可单测）

```ts
export function hasPermission(code: string): boolean {
  const perms = current;                 // undefined = 无宿主
  if (!Array.isArray(perms)) return true; // 独立态一律放行（component-guidelines.md:67）
  return perms.includes(code) || perms.includes('*');
}
```

`*` 通配与"独立态放行"两条都直接来自既有规范（`component-guidelines.md:66-67`：admin 通配 `*`；
独立态一律渲染，写操作靠接口 403 兜底）。

### 为什么订阅而不是只用挂载快照

宿主注释写明 `permissions` 是 getter、mount 时取值，但**mount 可能早于菜单加载**（首次访问未登录
即注册的路径）。此时拿到空数组 → 按钮永久隐藏直到重挂载。`onHostStateChange` 在 permissions
引用变化时推送（宿主注释："permissions 每次重算为新数组，引用比对即够"），订阅即可拿到后续真值。
**实现要点**：`onHostStateChange` 可能不存在（独立态/老宿主），必须判 `typeof === 'function'`
再订阅，并在 `unmount` 退订。

### React 绑定

模块级存储（`permission.ts`）+ `useSyncExternalStore`（React 19 内置，无新依赖）。
另提供 `<Permission code mode="hide|disabled">`，语义与 portal / iam-web 的同名组件一致
（`component-guidelines.md:48-68`：跨应用不互引，按各自 props/store 取码——skills-web 取其自有数据源）。

## 搜索设计

```ts
// filters.ts
export function searchSkills(skills: SkillItem[], query: string): SkillItem[]
```

- 归一化：`query.trim().toLowerCase()`；空查询 → 原样返回（**保持引用相等性**，避免无谓重排）。
- 匹配字段：`title`（子串）+ `outputTypes` / `roles` / `scenes` / `agents`（逐元素子串）。
- agents 匹配是**缩写码与全称的并集**（`AGENT_LABEL`：`CU` → Cursor）——用户按常识会输
  「Cursor」而非「CU」，只按码匹配等于搜不到；全称是码的语义展开（同一事实源 data.ts），
  属上述字段清单的**超集**，不改变「按码也能搜」的行为。
- 组合顺序：`sortSkills(searchSkills(filterSkills(SKILLS, active), query), sort)`
  —— **先筛选、再搜索、最后排序**（与 PRD R4 一致；排序作用于结果集，不影响匹配）。
- 组件侧不内联匹配逻辑；输入用 `useState` 受控，14 条种子无需防抖。

## 「按 Agent」维度

- `data.ts`：`AGENT_LABEL` 从 `skill-card.tsx` 迁入（现在两处需要它，必须单一事实源）；
  `SkillFilterGroup.id` 加 `'agent'`；`FILTER_GROUPS` 追加「按 Agent」组，选项由 `AGENT_LABEL`
  派生（`value` = 缩写码 `CC`/`CX`/`AG`/`CU`，`label` = 全称）。
- 计数沿用本文件既有约定（演示数值），**不**由 14 条种子反推——现有四组也是演示数值，
  混用两种口径会让"接真后端时只保留类型"的迁移边界变模糊。
- `filters.ts`：`agent` 走独立分支匹配 `skill.agents`。**必须按组 id 分派**——`CC` 这类缩写码
  与角色/场景等中文字符串混在同一个宽松匹配里迟早交叉命中（11-14 已为 `scene` 立过同样规矩）。
- 渲染位置：侧栏（`FILTER_GROUPS` 驱动，追加为第 5 组）与分类下拉（见下）。
- **与参考站的偏差（显式记录）**：参考站的「按 Agent」**只在下拉里**、侧栏没有；本任务按 D9
  把 agents 提升为可筛选维度，故**侧栏也会出现该组**。这是用户明确选择的行为，不是照搬参考站。

### 两组顺序（刻意不同，各有依据）

| 位置 | 顺序 | 依据 |
|---|---|---|
| 侧栏 | `FILTER_GROUPS` 原序 + 「按 Agent」追加在末位 | 最小扰动：现有 4 组的顺序已在 11-14 对照参考站定过并验收 |
| 分类下拉 | 按使用场景 → 按角色 → 按输出类型 → 按 Agent | 对齐参考站下拉的实际分组顺序（其 DOM 实测顺序） |

下拉用显式 id 数组 `['scene','role','output','agent']` 映射，**不**直接遍历 `FILTER_GROUPS`
（后者含「推荐/免费/精选」，参考站下拉里没有）。

## 分类下拉结构

```tsx
<div className={`dropdown ${open ? 'dropdown-open' : ''} relative z-50`}>
  <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
    分类 <AppIcon name="chevron-down" className="size-3.5" />
  </button>
  <div className="dropdown-content …" >
    <div className="grid grid-cols-1 gap-2.5 p-2.5 sm:grid-cols-[160px_minmax(0,1fr)]">
      <div role="tablist" aria-label="分类" className="flex flex-col gap-1 rounded-2xl bg-base-200 p-1.5">
        {GROUPS.map(g => <button role="tab" aria-selected={g.id===active} id={`cat-tab-${g.id}`} …/>)}
      </div>
      <div role="tabpanel" aria-labelledby={`cat-tab-${active}`} className="…">
        {items.map(i => <button onClick={() => { onToggle(group, value); close(); }} …/>)}
      </div>
    </div>
  </div>
</div>
```

四条实现要点：

1. **触发按钮留在遮罩之上**：遮罩 `fixed inset-0 z-40`，`.dropdown` 整体 `z-50`
   ——这样**无需测量工具栏底边**就能让触发器保持可见可点（参考站用 CSS 变量
   `--storefront-header-bottom` 实现同一意图，我们不必引入该变量）。遮罩同时盖住桌面侧栏，
   与参考站一致（其遮罩也盖住页内筛选侧栏）。
2. **受控开合**：用 daisyUI 的 `dropdown-open` 修饰符配合 React state，而不是 `<details>`
   ——需要在条目点击后程序化关闭。
3. **关闭路径三条**：点条目、点遮罩、按 Esc。Esc 用 `keydown` 监听（focus 在弹层内时）。
4. **窄屏堆叠**：`grid-cols-1 sm:grid-cols-[160px minmax(0,1fr)]`；弹层宽度
   `w-[min(688px,calc(100vw-2rem))]`（参考站同值），避免横向溢出。

## 上传入口与占位对话框

- `<Permission code="skills:skill:create">` 包裹上传按钮，模式 `hide`（无权限即不渲染）。
- 对话框用 `<dialog className="modal">` + `ref.showModal()`，关闭用 `method="dialog"` 的表单
  （modal 指南推荐做法），文案明确"上传功能待接入"。

## 影响面与风险

| 风险 | 说明 | 缓解 |
|---|---|---|
| 侧栏新增第 5 组 | 11-14 刚验收过的侧栏会被改动 | PRD 显式记录为 D9 的直接后果；侧栏测试的"4 个分组"断言需同步为 5 个 |
| 层级竞争重演 | 11-14 刚修过"卡片浮层穿透抽屉"；遮罩/弹层又引入 z-40/z-50 | 卡片已 `isolate`（z 值被收束），故 40/50 安全；仍须用 `elementFromPoint` 在弹层内打点验证，不靠肉眼 |
| 权限竞态 | 挂载早于菜单加载 → 拿到空数组 | 订阅 `onHostStateChange`；独立态按规范放行 |
| 下拉与抽屉状态互斥 | 小屏抽屉打开时工具栏不可达 | 无需处理；但**测试**要覆盖"下拉打开时无横向溢出" |
| 搜索与筛选的交互 | 两个过滤维度叠加 | 组合顺序在 `filters.ts` 固定为 filter → search → sort，并有纯函数单测 |
| 测试断言脆弱 | 侧栏分组数、上传按钮存在性 | 按语义定位（`role` + 可访问名），不数全文出现次数（11-14 的教训） |

## 回滚

改动集中在 `apps/skills-web/src/`（新增 5 个文件 + 修改 6 个）。无 token 变更、无宿主改动、
无接口契约变更（权限 props 是**新增可选字段**，老宿主不传即走独立态放行）。
回滚：`git revert` 本任务的提交，或 `git checkout -- apps/skills-web/src`。

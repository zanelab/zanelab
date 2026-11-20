# 设计：市场页列表区对照参考站重构

父任务 [PRD](../11-14-skills-marketplace-refactor/prd.md)｜本任务 [PRD](./prd.md)｜
参考站证据 [`research/reference-skillry-marketplace.md`](../11-14-skills-marketplace-refactor/research/reference-skillry-marketplace.md)

## 架构与边界

改造集中在 `apps/skills-web/src/pages/marketplace/` 一个目录，不改动其它 app 或 `packages/*`。

| 文件 | 改动性质 |
|---|---|
| `marketplace.tsx` | 删 `ActiveFilterChips`、去 `onClear` 传递、计数徽章改总数口径、栅格改列数、删"已经到底了。" |
| `skill-card.tsx` | 结构重写（去 `card`、满铺缩略图、三处浮层、标题行 + 头像组、hover 操作） |
| `filter-sidebar.tsx` | 头部改版（去"清除全部"）、选项行方角 + 字号层级、分组排版 |
| `data.ts` | `SkillFilterGroup.id` 加 `'scene'`、`SkillItem` 加 `scenes`、加第 4 分组与种子数据 |
| `filters.ts` | 新增 `scenes` 匹配分支 |
| `sort-tabs.tsx` | **不改**（选中态 `bg-neutral text-neutral-content` 与参考站 `bg-[#121313] text-white` 语义等价） |
| `marketplace.test.tsx` | 选择器/文案断言同步 |
| `index.css` | **不改**（零 token 改动，见 AC10） |

## 核心设计：参考站类名 → daisyUI 语义类名转译

"保留现有色板"不是简单照抄参考站类名，而是**保留它的结构、层级与间距，把颜色表达式换成
daisyUI 语义色**。逐项对照（左边是参考站写法，右边是本项目落地写法）：

| 位置 | 参考站 | 本项目落地 | 说明 |
|---|---|---|---|
| 页面底色 | 容器 `bg-background`(暖奶油) | 保持现状 `bg-base-200` + 内容区 `bg-base-100` | 结构不变，色板不动 |
| 缩略图边框 | `border-black/10` | `border-base-300` | 语义色 |
| 缩略图底色 | `bg-[#f7f7f5]` | 现有 `from-<tone>/25 to-<tone>/5` 渐变 | 参考站换成真实图前的底色 |
| 卡片标题 | `text-black/65` | `text-base-content/70` | 语义色 + 透明度层级 |
| 卡片标题字号 | `text-[13px] font-medium` | `text-[13px] font-medium` | 直接对齐（Tailwind 任意值为允许的工具类） |
| 侧栏底色 | `lg:bg-[#f4f1e9]` | 保持现状 `bg-base-100` | 色板不动 |
| 侧栏宽度 | `lg:w-[236px]` | 保持现状 `lg:w-60`（240px） | 4px 差异，不值得引入任意值 |
| 分组标题 | `text-[11px] font-semibold text-black/40` | `text-[11px] font-semibold text-base-content/40` | 语义色 |
| 分组分隔线 | `border-t border-black/8 pt-4` | `border-t border-base-300` + 首组 `first-of-type:border-t-0` | 分隔线色须与所在底色有对比：侧栏底色是 `base-200`，同底同色的 `base-200` 描边等于不存在（本任务实际踩过；详见「分组分隔线的颜色语义」） |
| 选项标签 | `text-[12.5px] text-black/62` | `text-xs text-base-content/70` | 12px vs 12.5px，取项目字号刻度 |
| 选项计数 | `text-[11px] tabular-nums text-black/32` | `text-[11px] tabular-nums text-base-content/35` | 语义色 |
| 复选框形态 | `size-[15px] rounded-[5px] border border-black/16 bg-white/50` | `checkbox checkbox-xs rounded-[5px]` | 见下节 |
| 计数徽章 | `bg-black/[0.06] text-black/55` | 保持现状 `bg-base-content/6 text-base-content/55` | 已等价 |
| 排序容器 | `border-black/10 bg-white/60` | 保持现状 `border-base-300 bg-base-100` | 已等价 |
| 排序选中态 | `bg-[#121313] text-white` | 保持现状 `bg-neutral text-neutral-content` | 已等价 |
| 媒体类型圆标 | `bg-white/50 backdrop-blur-md text-black/60` | `bg-base-100/60 backdrop-blur-md text-base-content/60` | 语义色 + 透明度 |
| 免费徽章 | `bg-[#f4ff71] text-[#121313]` | 保持 `badge badge-primary badge-sm` | 黄绿→primary 蓝；`primary` 全页仅此一处 |
| hover 操作钮 | `bg-white/50 backdrop-blur-md hover:bg-[#f4ff71]` | `btn btn-circle btn-sm btn-ghost bg-base-100/60 backdrop-blur-md` | 语义色；悬停态走 ghost 默认 |
| 底部压边 | `bg-[linear-gradient(to_top,rgba(0,0,0,0.72)…)]` | `bg-[linear-gradient(to_top,oklch(0%_0_0/0.72),oklch(0%_0_0/0.6)_32%,transparent)]` | **显式豁免**，见下节 |
| 统计文字 | `text-white [text-shadow:…]` | `text-white`（去 text-shadow） | **显式豁免**，见下节 |

## 组件选型（已按 daisyUI 组件发现协议读过指南）

| 需求 | 候选 | 选定 | 依据 |
|---|---|---|---|
| 侧栏 / 布局 | `drawer` / 自定义 sticky | **保持 `drawer`** | 项目规范 component-guidelines.md:70-85 明确要求；参考站的自定义 `lg:sticky` + `max-lg:fixed` 底部抽屉改写会违反规范 |
| 多选筛选组 | `filter` / `checkbox` / `radio` | **`checkbox`** | `filter` 是互斥单选按钮组（`components/filter.md`："When the user selects an option, the filter hides the other options."），与本页"组内 OR"不符；`radio` 同理不合 |
| 缩略图占位 | `skeleton` / `mockup-browser` / Tailwind 拼 | **Tailwind 渐变块** | `skeleton` 语义是"加载中"（`components/skeleton.md`），而这里是**永久**占位（无后端无图），用它语义错误；`mockup-browser` 正是要删掉的假浏览器装饰 |
| 兼容 Agent 头像组 | `avatar-group` / 手写 `-ml-1` 叠加 | **`avatar-group`** + `avatar avatar-placeholder` | `components/avatar.md`："Use `avatar-group` as a container for more than one avatar"；参考站手写的 `-ml-1` 叠加正是它的实现 |
| 徽章 | `badge` | **`badge`** | `components/badge.md`：`badge` + 一个 size + 可选一个 color |
| 排序胶囊 | `tabs`/`tabs-box` / 现有自拼 | **保持现有自拼** | `components/tab.md` 的 `tabs-box` 是方框分组样式，与参考站的全圆胶囊不合；现有实现已用 `role=tablist`/`role=tab`/`aria-selected` 承载语义 |
| 卡片 | `card` | **不用** | 参考站卡片无容器；用 `card` 会重新引入 `bg-base-100` + `card-body` 内边距，正是要消除的偏差 |

### 复选框形态的处理

根因（已在代码中确认，非推测）：`--radius-selector` 被
`use-preferences-runtime.ts:56` 设为 `--radius`（0.5rem = 8px），daisyUI checkbox 的圆角消费
`--radius-selector`，于是小尺寸 checkbox 渲染成近圆。

处理：保留 daisyUI `checkbox` 组件（不手写复选逻辑），加 Tailwind 工具类覆盖圆角：
`checkbox checkbox-xs rounded-[5px]`。依据 daisyUI usage 规则 2（"If the current daisyUI classes
cannot make a necessary change, use Tailwind CSS utility classes"）。若实现时发现 CSS 特异性压不过，
再按规则 3 加 `!`（`rounded-[5px]!`），但优先尝试不加。

**不采用**手写 `<span>` 方块 + 视觉隐藏 input 的方案：daisyUI 已有 `checkbox`，规范要求
"能不用自定义 CSS 就不用"（component-guidelines.md:8）。

同时去掉 `checkbox-primary`：daisyUI colors 规则 10 要求 `primary` 每页只用一次，该名额归
`免费` 徽章。

## 侧栏（`drawer-side`）结构契约

> 2026-11-15 补。规划期只分别读了 `marketplace.tsx` 与 `filter-sidebar.tsx`，看到两处各有 `aside`
> 却没有意识到它们是**嵌套**关系，design.md 未覆盖这块，导致三个缺陷漏到验收才被用户发现。

### daisyUI `drawer-side` 的实际布局契约（查编译后 CSS 得到，非推测）

| 模式 | 规则 | 含义 |
|---|---|---|
| 小屏（默认） | `.drawer-side{position:fixed;width:100%;display:grid;grid-template-columns:1fr}`；`.drawer-side>:not(.drawer-overlay){translate:-100%}` | 面板是覆盖层，**宽度由子元素自身决定**（`w-72`）；子元素平移出屏 |
| `lg:drawer-open` | `.drawer-open>.drawer-toggle~.drawer-side{width:auto;display:block;position:sticky}` | 侧栏变成 sticky 块，**列宽同样由子元素自身宽度决定** |

结论：**`drawer-side` 不承担撑宽职责**，宽度必须写在唯一的子元素（`FilterSidebar` 的 `aside`）上。
因此 `marketplace.tsx` 里那层包裹 `aside` 是纯粹的重复，必须删除。

### 目标结构

```tsx
// marketplace.tsx —— drawer-side 里只有 overlay + FilterSidebar，没有外层 aside
<div className="drawer-side">
  <label htmlFor="skills-filter-drawer" aria-label="关闭筛选" className="drawer-overlay" />
  <FilterSidebar ... />
</div>

// filter-sidebar.tsx —— 唯一的一层 aside，宽度/内边距/描边/滚动都只写在这里
<aside className="border-base-300 bg-base-200 flex h-full w-72 flex-col border-r lg:w-60 lg:overflow-y-auto">
```

### 两条不变量

1. **`aside` 只能有一层**。两层会产生重复的 `role` landmark（同页两个 `aside`，其中一个还是另一个
   的祖先），同时把宽度、内边距、背景、描边、sticky 全部声明两遍。
2. **宽度不得分层声明**。外层 `lg:w-60`(240px) 扣掉自身 `px-4`(32px) 后可用宽 208px，内层再声明
   `lg:w-60`(240px) → 子元素比容器宽 32px，形成横向溢出（用户看到的横向滚动条）。
   `min-w-0` 只能解决 flex/grid 子项的收缩，解决不了「显式宽度 > 容器可用宽度」。

### 底色关系

参考站的侧栏底色**等于页面底色**（`lg:bg-[#f4f1e9]`，即其 `--background`），靠 `border-r` 与内容列
分隔——不是"在灰底上放一块白面板"。落地方案：侧栏用与页面包裹层相同的 `bg-base-200`
（必须**显式**写，因为小屏面板是覆盖层，透明会漏出底下内容），分隔线用 `border-base-300`
（与 `base-200` 同底时 `base-200` 描边不可见）。**侧栏内所有分隔线都要用 `base-300`**——分组之间的
`border-t`、外缘 `border-r`、小屏确认条的 `border-t`。把底色从 `base-100` 换成 `base-200` 时若不
同步换分隔线色，`border-base-200` 会与底色同色而彻底消失（本任务实际踩过这个坑）。

### `drawer-open` 不得条件性重复添加

容器上写静态 `lg:drawer-open` 是**响应式常驻**；再按状态追加一个裸 `drawer-open` 是**强制开启**，
两者语义不同。daisyUI 的 `.drawer-open>.drawer-toggle~.drawer-side` 会把 `.drawer-side` 从
`position:fixed; display:grid; width:100%`（覆盖层）翻成 `position:sticky; display:block; width:auto`
（内联列）。

后果（实测）：小屏开抽屉时内容被挤成 240px 窄列、遮罩 `backgroundColor` 变 `rgba(0,0,0,0)`、
375/320 宽下 html `scrollWidth 378 > clientWidth 375`（真实横向溢出）。

**正确做法**：容器只保留静态的 `lg:drawer-open`；小屏开合完全交给受控的
`drawer-toggle` 复选框（`checked` + `onChange`）——`.drawer-toggle:checked~.drawer-side` 本就负责
显出覆盖层。

### 桌面收起机制（R16 / 决策 D6）

收起 = **让 `lg:drawer-open` 在桌面失效**：容器类名写 `` `drawer ${collapsed ? '' : 'lg:drawer-open'}` ``。
此时 `.drawer-side` 回到覆盖层模式（`position:fixed`，不占布局宽度），而复选框未被勾选，
daisyUI 保持其 `visibility:hidden; opacity:0`，于是侧栏完全不可见且不占宽。展开即恢复该类名。

- 收起钮：`FilterSidebar` 头部，仅桌面可见（`max-lg:hidden`），图标 `layout-sidebar-collapse`。
- 展开钮：内容区标题行排序控件左侧，仅在收起时渲染且仅桌面可见，图标 `layout-sidebar-expand`。
- 状态：`marketplace.tsx` 的页面内 `useState`。**不持久化**（用户未选持久化方案）。

> 选择"去掉 `lg:drawer-open`"而不是"不渲染 `FilterSidebar`"：前者只切一个类名，`drawer-side`
> 与复选框的结构保持不变，小屏路径零影响；后者会让小屏的开合依赖条件渲染，多一条状态分支。

### 分组分隔线的颜色语义

参考站用 `border-t border-black/8`——一条**比底色略深**的细线。落到本项目，分隔线色要满足
「与所在底色有可见对比」：`base-200` 底上用 `base-300`，`base-100` 底上可用 `base-200` 或 `base-300`。
本任务侧栏统一 `base-300`。这不是随意取值——同底同色的描边等于不存在，是本任务实际出现过的回归。



## 显式豁免：深色压边与叠加其上的白色文字

参考站底部的黑色渐变压边 + 白色统计文字，是为了在任何缩略图内容上都能读清数字。这不适合换成
语义色：

- `text-base-content` 在深色主题下变浅白、浅色主题下变近黑 —— 压在同一渐变上时两者之一必然
  不可读。
- 压边若用 `base-content`，深色主题会得到一条**亮色**渐变压边，把白字吃掉。

因此按 daisyUI colors 规则 11 的例外条款（"In rare cases, you can use a Tailwind CSS color if
content must keep the same color in all themes… For an SVG icon or chart, a fixed color can be
necessary."）显式豁免：压边固定为中性黑，统计文字固定 `text-white`。
**这是本任务唯一允许出现固定色的位置**，AC5 按此口径核对；AC6 需在浅色与深色两个主题下分别
确认该处对比度。

## 数据与契约变更

### 类型

```ts
// data.ts
export type SkillFilterGroup = {
  id: 'free' | 'featured' | 'output' | 'role' | 'scene';   // 新增 'scene'
  title: string;
  options: Array<{ value: string; label: string; count: number }>;
};

export interface SkillItem {
  // …现有字段不变
  scenes: string[];   // 新增：按使用场景，与 roles 同形
}
```

新增分组（对齐参考站文案与演示计数）：

```ts
{
  id: 'scene',
  title: '按使用场景',
  options: [
    { value: '内容与编辑发布', label: '内容与编辑发布', count: 151 },
    { value: '知识解释与教学', label: '知识解释与教学', count: 36 },
    { value: '品牌建立与视觉规范', label: '品牌建立与视觉规范', count: 59 },
    { value: '社交内容与营销活动', label: '社交内容与营销活动', count: 51 },
  ],
}
```

### 筛选匹配

`filters.ts` 当前对非 flag 值走宽松的 `outputTypes.includes(value) || roles.includes(value)`。
新增场景组必须走**独立分支**，否则场景值会与角色值交叉命中（两者都是中文字符串，宽松匹配下
语义边界靠不住）：

```ts
const flagField = FLAG_FIELD[value];
if (flagField) return skill[flagField];
if (SCENE_VALUES.has(value)) return skill.scenes.includes(value);
if (OUTPUT_VALUES.has(value)) return skill.outputTypes.includes(value as …);
return skill.roles.includes(value);
```

`SCENE_VALUES` / `OUTPUT_VALUES` 由 `FILTER_GROUPS` 派生（避免第二份事实源），
或直接按组匹配：`filterSkills` 已拿到组 id，按组 id 分派比按值反查更干净 —— 实现时优先
按组 id 分派，保持 `toggleFilter` 签名不变。

### 计数徽章口径

从"显示 N / M 个 Skills"改为**总数**口径（对齐参考站"620 个 Skills"）。
注意：**筛选生效后筛选结果的反馈只依赖卡片网格本身**（chips 已移除、计数不再显示 N/M）。
这是用户明确选择的"严格对齐参考站"的代价，不是遗漏。

## 影响面与风险

| 风险 | 说明 | 缓解 |
|---|---|---|
| 现有测试大面积失效 | 测试断言 `card-title` 类名、h2 层级、"显示 14 / 14"、"已经到底了。"、13 处"免费"文本 | R12 同步更新选择器；行为契约断言（AC7）原样保留，作为"没改坏"的锚 |
| "免费"文本计数脆弱 | 现断言恰好 13 处（12 卡片 + 1 侧栏标签）；侧栏结构一变就崩 | 改为按 `role` 与容器限定定位，不再数全文出现次数 |
| 深色主题下压边/统计可读性 | 唯一固定色区域 | AC6 双主题实测 |
| 卡片标题行变挤 | 标题 + 头像组同处 `h-6` 行，长标题需 `truncate` | 标题 `min-w-0 truncate`、头像组 `shrink-0` |
| 140 字栅格在 portal 内更窄 | 宿主内容区约 1260px，减去本页侧栏 240px 后网格约 990px，`xl:4` 时每卡约 235px（参考站约 273px） | 按用户"对齐结构"指令采纳；卡片为图片优先布局，窄 40px 可接受；AC4 截图确认观感 |
| 无后端的新增交互 | `喜欢`/`收藏` 无持久化 | 实现为页面内本地 state + `aria-pressed`，不伪装成已保存；在实现说明中标注 |

## 回滚

改动集中在 `apps/skills-web/src/pages/marketplace/` 六个文件，无跨 app 依赖、无 token 变更、
无接口契约变更。回滚方式：`git checkout -- apps/skills-web/src/pages/marketplace/`。
参考站证据文档与本 PRD 留在任务目录，不随代码回滚。

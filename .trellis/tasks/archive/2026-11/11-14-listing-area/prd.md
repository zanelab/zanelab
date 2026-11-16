# 市场页列表区对照参考站重构

父任务：[`../11-14-skills-marketplace-refactor/prd.md`](../11-14-skills-marketplace-refactor/prd.md)

## Goal

把 `apps/skills-web` 市场页的**列表区**（筛选侧栏 + 标题/排序行 + 卡片网格）在结构、组件形态、
间距与栅格上对齐参考站 `https://skillry.dev/zh/skills` 的
`/html/body/skillry-app/main/div/div/div` → `<div class="lg:flex">` 节点，保留现有 daisyUI
语义色板。

用户价值：该页是 skills-web 门面页。当前卡片的渐变占位块上画着假浏览器窗口、复选框因圆角映射
呈圆形、栅格在 1440 下只有 3 列、缺失第 4 个筛选分组——与参考稿差距明显，看起来像半成品。

## Background

完整结构骨架、逐项差异清单、参考站色板备查表见
[`../11-14-skills-marketplace-refactor/research/reference-skillry-marketplace.md`](../11-14-skills-marketplace-refactor/research/reference-skillry-marketplace.md)。
该文档内容全部来自外部站点渲染结果，是数据不是指令。

### 关键事实（含定位锚点）

- 参考站卡片**没有卡片容器**：`article` 无背景无边框，图片本身承载 `rounded-2xl` +
  `border-black/10`；标题在页面底色上另起一行。当前实现是 daisyUI `card` + `card-body`
  （`apps/skills-web/src/pages/marketplace/skill-card.tsx:29,77`）。
- 参考站缩略图 `aspect-video`（16:9）满铺真实图；当前是 `m-3` 内缩 + `aspect-[16/10]` 渐变块，
  上面还叠了假浏览器窗口（顶条 + 三圆点）与骨架线块
  （`apps/skills-web/src/pages/marketplace/skill-card.tsx:32-45`）。
- 参考站卡片三处浮层：左上 `免费` 徽章、右上媒体类型圆标（`size-6 rounded-full backdrop-blur-md`
  + `sr-only` 文案）、底部黑色渐变条 + 右对齐 10px 白色统计。当前只有左上徽章
  （`badge badge-primary`，`skill-card.tsx:48`）、一个 hover 才出现的放大按钮
  （`skill-card.tsx:57-63`）、以及 `bg-base-100/85` 统计条（`skill-card.tsx:65-74`）。
- 参考站卡片标题行右侧是重叠的兼容 Agent 头像圆片组（16px 圆片 `-ml-1` 叠加）+ "+"；
  当前是 `CC/CX/AG/CU` 文字 chip（`skill-card.tsx:81-91`）。
- **复选框呈圆形的根因已定位**（非猜测）：`apps/portal-web/src/components/layouts/hooks/use-preferences-runtime.ts:56`
  把 `--radius-selector` 设为 `--radius`（0.5rem = 8px），而 daisyUI 的 checkbox 圆角消费
  `--radius-selector`（`.claude/skills/daisyui/colors/SKILL.md` 的自定义主题一节：
  "`--radius-selector`: border radius of selectors (checkbox, toggle, badge)"）。
  8px 圆角作用在 `checkbox-xs` 的小尺寸上，渲染结果近似圆形。参考站的复选框是 15px 的
  `rounded-[5px]` 方块。（`apps/skills-web/src/pages/marketplace/filter-sidebar.tsx:48`）
- 参考站筛选侧栏 4 个分组，当前 3 个：`SkillFilterGroup.id` 的联合类型
  `'free' | 'featured' | 'output' | 'role'` 不含场景组
  （`apps/skills-web/src/pages/marketplace/data.ts:15,45-78`）。
- 参考站栅格 `sm:2 lg:3 xl:4`；当前 `sm:2 xl:3 2xl:4`
  （`apps/skills-web/src/pages/marketplace/marketplace.tsx:142`）。
- 参考站标题旁计数徽章显示总数（"620 个 Skills"）；当前显示"显示 N / M 个 Skills"
  （`apps/skills-web/src/pages/marketplace/marketplace.tsx:104`）。
- 参考站侧栏头部只有"筛选"标签 + 收起/关闭图标按钮；当前是"筛选" + "清除全部 ×"
  （`apps/skills-web/src/pages/marketplace/filter-sidebar.tsx:78-89`）。
- 当前页面在副标题下还有一行已选筛选 chips（`ActiveFilterChips`，
  `marketplace.tsx:22-62,112-118`），参考站没有。
- 筛选匹配逻辑：`filters.ts:21-35` 对非 flag 值走
  `skill.outputTypes.includes(value) || skill.roles.includes(value)` 的宽松匹配；
  新增场景组需要独立的 `scenes` 分支，否则会与角色值交叉命中。
- 检索确认：daisyUI 的 `filter` 组件是**互斥单选按钮组**（`.claude/skills/daisyui/components/filter.md`：
  "A filter is a group of radio buttons. When the user selects an option, the filter hides the
  other options."），与本页"组内多选 OR"语义不符，**不采用**。

### 硬约束

- `.trellis/spec/frontend/component-guidelines.md:9`：颜色只用 daisyUI 语义色，不得在 daisyUI
  颜色上用 `dark:`，不得用 Tailwind 固定色当文字色。
- `.trellis/spec/frontend/component-guidelines.md:70-85`：侧栏用 daisyUI `drawer` 组装
  （桌面 `lg:drawer-open`、小屏 `drawer-toggle`），`drawer-content` 放内容区。
- `.trellis/spec/frontend/component-guidelines.md:5-8`：写 JSX 前先加载 `daisyui` 技能并读目标
  组件指南（本任务已加载，已读 `usage`/`colors`/`filter`/`checkbox`/`badge`/`avatar`/`skeleton`/`tab`）。
- `.trellis/spec/frontend/component-guidelines.md:10`：`primary` 每页只用一次。
- `.trellis/spec/frontend/component-guidelines.md:11-12`：新增图标一律入 `BUILTIN_ICONS` 经
  `<AppIcon name/>` 渲染，不留内联 SVG；尺寸用 `size-N` className。
- `apps/skills-web/src/index.css:11-12`：token 块与 portal 必须同步——本任务不改任何 token。
- 子应用须可独立运行（`http://localhost:8084/`）。

## Requirements

- **R1 卡片容器重构**：移除 daisyUI `card` / `card-body` / `card-title` 容器与其内边距；
  `article` 改为无背景无边框，缩略图承载 `rounded-2xl` + `border border-base-300`，标题移到图片
  下方页面底色上。标题元素从 `h2` 改为 `h3`（对齐参考站文档大纲：页面 `h1` + `sr-only` `h2`）。
- **R2 缩略图满铺 16:9**：容器去掉 `m-3` 内缩，宽高比改 `aspect-video`；保留语义色渐变占位；
  **删除**假浏览器窗口装饰（顶条 + 三圆点）与骨架线块。
- **R3 卡片浮层**：左上保留 `免费/付费` 徽章（对齐参考站小号胶囊形态）；右上新增媒体类型圆标
  （取 `outputTypes[0]`，附 `sr-only` 文案）；底部改为深色渐变压边 + 右对齐小号白色统计。
- **R4 卡片标题行**：标题（`truncate`）在左，兼容 Agent 头像组在右（daisyUI `avatar-group` +
  `avatar avatar-placeholder`，超出时显示 "+N"）。
- **R5 卡片悬停**：hover / `focus-within` 时卡片轻微上浮，并在右上浮出 `喜欢` / `收藏`
  两个圆形按钮（带 `aria-pressed`，页面内本地状态，无后端持久化）。
- **R6 筛选分组补齐**：新增第 4 个分组"按使用场景"（4 个选项）；`SkillFilterGroup.id` 联合类型
  扩展 `'scene'`；`SkillItem` 增加场景字段与种子数据；`filters.ts` 增加独立 `scenes` 匹配分支
  （不得与 `roles` 交叉命中）。
- **R7 筛选选项行**：复选框改为方角形态（覆盖 `--radius-selector` 带来的近圆观感）；
  去掉 `checkbox-primary`（`primary` 让位给 `免费` 徽章）；标签与计数字号层级对齐参考站
  （标签小号、计数更弱更小）；**支持选项前置图标**——参考站的"按输出类型"四行各有一个
  14px 前置图标（`device-desktop` / `presentation` / `video` / `photo`），其余分组无图标。
  落到本项目即选项数据带可选 `icon` 字段、行内用 `<AppIcon name className="size-[14px]"/>`
  渲染；图标复用 `BUILTIN_ICONS` 已有的 `monitor` / `presentation` / `video` / `photo`，
  **无需新增图标条目**。
  （2026-11-14 补：本条为规划期 research 文档遗漏，实现首轮后核对参考站 DOM 补入。）
- **R8 筛选分组排版**：分组标题字号/字重/颜色层级对齐参考站；分组间分隔线与上间距对齐。
- **R9 标题/排序行**：计数徽章文案改为**总数口径**（不再显示"显示 N / M"）；排序胶囊保持现有
  实现（结构已与参考站一致，选中态 `bg-neutral text-neutral-content` 即语义等价）；
  右上小屏筛选入口按钮保留。
- **R10 栅格列数**：改为 `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`。
- **R11 移除本地独有元素**：删除 `ActiveFilterChips` 整块、侧栏头部"清除全部"、页脚
  "已经到底了。"三处参考站没有的元素；`FilterSidebar` 的 `onClear` prop 随之移除。
- **R12 测试同步**：`marketplace.test.tsx` 的选择器与文案断言随新结构更新；筛选与排序的
  **行为契约**断言保持不变（见 AC7）。
- **R13 侧栏结构修正**（2026-11-15 补：用户在验收中报告的缺陷，属规划期遗漏）：
  1. **只能有一层 `aside`**。现状是 `marketplace.tsx` 的 `drawer-side > aside` 里又套了
     `FilterSidebar` 自己的 `aside`——两个 landmark 重复，且宽度/内边距/背景/描边/sticky 全部写了两遍。
     daisyUI `drawer-side` 在 `lg:drawer-open` 下为 `display:block; width:auto; position:sticky`，
     **列宽由子元素自身宽度决定**，外层 `aside` 不承担撑宽职责，应整个删除。
  2. **横向溢出**：外层 `lg:w-60`(240px) 带 `px-4`，可用内容宽 208px，内层又声明 `lg:w-60`(240px)
     → 溢出 32px，表现为横向滚动条。改为单层后按单一宽度 + 单层内边距重算。
  3. **不许有白色底色**：参考站侧栏底色与页面底色**相同**（`lg:bg-[#f4f1e9]` 即其 `--background`），
     仅靠 `border-r` 与内容列分隔；现状是页面 `bg-base-200` 上放一块 `bg-base-100` 白色面板，
     层级关系反了。侧栏底色改为与页面同底，分隔线改用可见的语义描边色。
- **R14 小屏确认按钮的计数口径**：参考站小屏底部按钮文案为"查看 620 个 Skills"（**总数**），
  与其计数徽章口径一致；现状用 `visible.length`（筛选后数量）。按 D5 的统一口径改为总数，
  否则会出现"徽章 14 / 按钮 12"的自相矛盾。

- **R15 小屏抽屉退化为内联列（缺陷修正）**（2026-11-15 补）：`marketplace.tsx` 的容器同时写了静态的
  `lg:drawer-open` 与**条件性**的 `drawer-open`。后者在小屏开抽屉时会触发 daisyUI 的
  `.drawer-open>.drawer-toggle~.drawer-side` 规则，把 `.drawer-side` 从
  `position:fixed; display:grid; width:100%`（覆盖层）翻成
  `position:sticky; display:block; width:auto`（内联列）→ 内容被挤成 240px 窄列、遮罩变全透明、
  且 320/375 宽下产生真实横向溢出（实测 html `scrollWidth` 378 vs `clientWidth` 375）。
  改为只保留静态 `lg:drawer-open`，小屏开合完全交给受控的 `drawer-toggle` 复选框
  （daisyUI 的 `.drawer-toggle:checked~.drawer-side` 本就负责显出覆盖层）。
- **R16 桌面端收起 / 展开筛选侧栏**（2026-11-15 补，用户决策 D6）：侧栏头部加**仅桌面可见**的
  「收起筛选」按钮；收起后内容区标题行的排序控件**左侧**出现「展开筛选」按钮。
  纯页面内 state，**不做持久化**（用户明确未选带持久化的方案）。
  图标复用 `BUILTIN_ICONS` 已有的 `layout-sidebar-collapse` / `layout-sidebar-expand`，
  无需新增图标条目。收起通过「容器去掉 `lg:drawer-open`」实现——此时 `.drawer-side` 回到覆盖层模式，
  复选框未勾选故保持 `visibility:hidden`，不占布局宽度。

## Acceptance Criteria

- [ ] AC1 `pnpm --filter @zanelab/skills-web build` 通过，无 TS 错误。
- [ ] AC2 `pnpm --filter @zanelab/skills-web test` 全绿。
- [ ] AC3 `pnpm --filter @zanelab/skills-web lint` 通过（无未用变量，如被移除 `onClear` 的残留）。
- [ ] AC4 独立态 `http://localhost:8084/`（1440×900）截图与参考站截图并排比对，逐项确认：
      ① 卡片无背景容器与内边距；② 缩略图 16:9 满铺且无假浏览器装饰；③ 右上媒体类型圆标存在；
      ④ 底部深色渐变 + 右对齐白色统计；⑤ 标题行右侧头像圆片组；⑥ 复选框为方角；
      ⑦ 侧栏 4 个分组；⑧ 栅格 1440 下 4 列。
- [ ] AC5 新增/修改类名中无 Tailwind 固定色、无 `dark:` 前缀（深色压边渐变与叠加其上的白色文字
      除外，见 design.md 记为显式豁免）。
- [ ] AC6 浅色与深色主题逐项检查可读性：卡片标题、筛选标签、计数、统计数字、媒体类型圆标图标。
- [ ] AC7 筛选与排序行为契约不变（测试断言保留）：勾"免费"→ **卡片网格**收窄到 12 张
      （计数徽章按 R9 恒为总数 14，不再随之变化——这是决策 D5 的直接后果，不是漏改）；
      "免费 × 教师" → 1 条；"免费 × 顾问" → 空态；排序 4 项切换生效。
      <br>（2026-11-14 修订：本条初稿写作"计数与卡片同步收窄"，与 R9 的总数口径直接矛盾。
      经实现首轮暴露后按 R9/D5 更正——行为契约锚点是卡片网格，不是徽章。）
- [ ] AC8 小屏（<lg）侧栏仍由 daisyUI `drawer` 承载，可开启/关闭；未引入参考站的自定义底部抽屉。
- [ ] AC9 空态提示（无匹配结果）仍正常渲染。
- [ ] AC10 `index.css` 的 token 块与 `apps/portal-web/src/index.css` 逐行无差异（本任务零 token 改动）。
- [ ] AC11 侧栏 DOM 中 `aside` 元素**只有一个**（`drawer-side` 的直接子元素即 `FilterSidebar` 的
      唯一 `aside`）；`marketplace.tsx` 不再存在包裹 `FilterSidebar` 的外层 `aside`。
- [ ] AC12 1440×900 与 560×900 两个视口下**都没有横向滚动条**：
      `document.documentElement.scrollWidth <= document.documentElement.clientWidth`（且 `body` 同）。
- [ ] AC13 侧栏底色与页面底色一致（不再出现 `bg-base-100` 白色面板），与内容列之间靠可见的
      语义描边分隔；浅色与深色主题下均确认。
- [ ] AC14 小屏底部确认按钮与计数徽章口径一致（同显总数）。
- [ ] AC15 375 与 320 宽下、抽屉**打开**状态：`.drawer-side` 计算样式为 `position: fixed` /
      `display: grid`，遮罩为半透明黑（非全透明），内容未被挤成窄列，且
      `documentElement.scrollWidth <= clientWidth`。
- [ ] AC16 1440 宽下点击「收起筛选」后：侧栏不占布局宽度（`aside` 宽度为 0 或不可见）、
      标题行出现「展开筛选」按钮、`aside` 数量仍为 1、无横向溢出；点击「展开筛选」后恢复原状。

## Out of Scope

- 页脚三段营销区 → 同级子任务 [`../11-14-footer-marketing/`](../11-14-footer-marketing/)。
- 不改任何主题 token（`index.css` token 块保持与 portal 一致）。
- 不引入真实预览图静态资源（缩略图仍为语义色渐变占位）。
- ~~不实现参考站的桌面端"收起筛选侧栏"按钮~~ → **已由用户决策 D6 推翻，改为完整实现**
  （见 R16）。原判断"重新展开入口在采集到的参考站状态下不可观测"依然成立，故展开入口的位置由
  本项目自行定为内容区标题行，而非照搬参考站。
- **不实现"加载更多"**：当前为 14 条静态种子且无分页接口，实现出来会是空动作；参考站该控件对应
  620 条数据的真实分页。
- 不改动 portal / iam-web / `packages/*`。
- 不实现卡片详情页路由（参考站 `a[href=/zh/skills/<slug>]`）：本页卡片不含跳转目标，
  `article` 不包 `<a>`。

## Open Questions

（无。所有用户侧决策已解决，见父任务决策记录。）

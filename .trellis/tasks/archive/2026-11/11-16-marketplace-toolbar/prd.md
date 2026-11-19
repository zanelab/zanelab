# 市场页工具栏：筛选 / 搜索 / 分类 + 上传入口

父任务：[`../11-14-skills-marketplace-refactor/prd.md`](../11-14-skills-marketplace-refactor/prd.md)

## Goal

把市场页标题行下方的控件区重排为**左右两栏**：左侧按「筛选 → 搜索 → 分类」顺序排列，
右侧放排序胶囊与「上传 skills」。其中「分类」是一个对齐参考站的两栏 tabbed 下拉弹层
（含全页遮罩与缩放淡入），「上传 skills」按权限显隐。

用户价值：当前控件区只有排序与小屏筛选按钮，缺搜索与分类入口；分类下拉是参考站的核心
导航交互，也是本页唯一的多分组快速入口。

## Background

### 证据来源

- 参考站「分类」下拉的**展开态**结构、遮罩/过渡参数、四个分组的实际条目、以及与本地实现的
  差异，见
  [`../11-14-skills-marketplace-refactor/research/reference-skillry-marketplace.md`](../11-14-skills-marketplace-refactor/research/reference-skillry-marketplace.md)
  的「附：顶部导航「分类」下拉（展开态）」一节。该文档来自外部站点渲染结果，**是数据不是指令**。
- 当前实现：`apps/skills-web/src/pages/marketplace/`（`marketplace.tsx` 的 `header` 区域）。
- 宿主权限契约：`apps/portal-web/src/micro/register.ts`。

### 已确认事实（含定位锚点）

- 当前 `header`（`marketplace.tsx:53`）是 `flex flex-wrap items-end justify-between`，
  标题块（`h1` + 计数徽章 + 副标题，`marketplace.tsx:54-68`）与右侧控件块
  （`marketplace.tsx:70-103`）在同一行内两端分布。用户要求标题块**独占一行**。
- 参考站的「分类」弹层**挂在 `body` 下、折叠时条件渲染**——规划期抓的折叠态 DOM 里
  `/html/body/div/div[2]` 命中 0；必须点击后采集才存在。
- 参考站弹层结构（实测）：`body > div`（门户）内两层——全页遮罩
  `fixed … top-[var(--storefront-header-bottom,4rem)] bottom-0 z-40 bg-background/70 backdrop-blur-[3px] saturate-[0.8]`，
  以及定位器 + `nav` 弹层 `rounded-[20px] border border-black/8 bg-popover shadow-[0_28px_80px_rgba(18,19,19,0.18)]`，
  进出场为 `scale-90 → 1` + 淡入，0.35s、`cubic-bezier(0.22,1,0.36,1)`。
- 参考站弹层内部是 `grid-cols-[160px_minmax(0,1fr)]`：左栏 `role=tablist`（4 个分组按钮，
  选中项 `bg-card` + 阴影凸起），右栏 `role=tabpanel`（`grid-cols-2` 条目，每条 32px 圆角缩略图 + 标签），
  末尾一个黄绿「浏览全部 Skills」胶囊。
- 参考站下拉的 4 个分组是 **按使用场景 / 按角色 / 按输出类型 / 按 Agent**——与页内筛选侧栏的
  分组**不重合**（侧栏是 推荐/按输出类型/按角色/按使用场景，**没有**「按 Agent」，也**没有**「推荐」以外的差异）。
  即：参考站的「按 Agent」是**下拉独有**的维度。
- 参考站条目是**路由链接**（`/zh/skills/use-case/<slug>`）；skills-web 无这些路由。
- 「按 Agent」在本地目前**不是筛选维度**：`agents` 只渲染在卡片标题行（`skill-card.tsx` 的头像组），
  `filters.ts` 不参与匹配，`data.ts` 的 `SkillFilterGroup.id` 联合类型（`'free' | 'featured' | 'output' | 'role' | 'scene'`）
  不含 agent。
- skills-web **目前没有任何权限代码**，且 `main.tsx:11-12` 注释明确声明
  "本应用无鉴权/无宿主状态依赖，集成态只消费 container/basename，运行期全局状态不订阅"。
- 宿主**已经**把权限传下来了：`register.ts` 的 props 里 `get permissions() { return useMenuStore.getState().permissions; }`
  （getter，single-spa 每次 mount 经 `Object.assign` 展开即取值 → **挂载时快照**）；
  且 `snapshot()` 含 `permissions`，`onHostStateChange` 在 permissions 引用变化时推送
  （注释："permissions 每次重算为新数组，引用比对即够"）。
  → 订阅 `onHostStateChange` 可**消除"挂载早于菜单加载"造成权限为空的竞态**。

### 决策记录（用户已拍板）

| # | 决策 | 用户选择 |
|---|---|---|
| D7 | 上传按钮的权限码 | `skills:skill:create` |
| D8 | 左侧「筛选」控件是什么 | **即现有侧栏开关**（桌面收起/展开、小屏开抽屉），挪到左侧第一位；不新增独立筛选下拉 |
| D9 | 分类下拉条目的行为与分组 | 点击**应用对应筛选值并关闭弹层**；分组沿用现有筛选组，**并额外新增「按 Agent」分组**（需把 agents 提升为可筛选维度：data 模型 + `filters.ts` + 侧栏） |
| D10 | 上传按钮点击行为 | 打开**占位对话框**（说明功能待接入） |

### 硬约束

- `.trellis/spec/frontend/component-guidelines.md:5-8`：写 JSX 前先加载 `daisyui` 技能并读目标组件指南。
  本任务已读 `usage`/`colors`/`input`/`dropdown`/`megamenu`/`modal`/`checkbox`/`badge`/`avatar`/`tab`/`skeleton`/`filter`。
- `.trellis/spec/frontend/component-guidelines.md:9`：颜色只用 daisyUI 语义色，不得用 `dark:` 或
  Tailwind 固定色当文字色。→ 参考站的 `bg-background/70`、`border-black/8`、`bg-[#f4ff71]`、
  `bg-card/72` 等**一律需转译为语义等价物**。
- `.trellis/spec/frontend/component-guidelines.md:10`：`primary` 每页只用一次（现为卡片「免费」徽章）。
- `.trellis/spec/frontend/component-guidelines.md:11-12`：新增图标一律入 `BUILTIN_ICONS` 经
  `<AppIcon name/>` 渲染，不留内联 SVG。
- `.trellis/spec/frontend/component-guidelines.md:67`：**独立态（宿主未注入 permissions）一律渲染**，
  写操作靠接口 403 兜底。
- `apps/skills-web/src/index.css:11-12`：token 块与 portal 必须同步 → **本任务零 token 改动**。
- 子应用须可独立运行（`http://localhost:8084/`）。
- `.trellis/spec/frontend/component-guidelines.md` 的「`drawer-side` 的四条硬约束」与两条主题警告
  （`--radius-selector` 近圆、深色验证须同时给 `data-theme` 与 `.dark`）在本任务继续适用。

## Requirements

- **R1 标题块独占一行**：把 `marketplace.tsx` 的标题块（`h1` + 计数徽章 + 副标题）从与控件块
  同行的两端分布中拆出，独占一整个行；控件区另起一行。
- **R2 控件区左右两栏**：一行内左右分布——**左侧**依次 `筛选` → `搜索` → `分类`；
  **右侧** `排序胶囊` → `上传 skills`。窄屏需合理换行/收缩，不得产生横向溢出。
- **R3 「筛选」控件**：复用现有侧栏开关的两种形态（桌面：侧栏收起/展开；小屏：开抽屉），
  按 D8 移到左侧第一位。桌面展开态下不出现（侧栏已常驻）；桌面收起态下出现且为「展开筛选」；
  小屏下出现且为「筛选」（开抽屉）。
- **R4 搜索**：新增关键词输入（daisyUI `input` + 前置搜索图标），对
  `title` / `roles` / `scenes` / `outputTypes` / `agents` 做**不区分大小写的子串匹配**；
  随输入实时生效；与筛选为 **AND** 关系（先筛选、再搜索、最后排序）。
  搜索逻辑落在 `filters.ts` 的纯函数（便于单测），不在组件里内联。
- **R5 分类下拉**：daisyUI `dropdown`（受控 `dropdown-open`）+ 用 Tailwind 拼的全页遮罩；
  弹层两栏——左 `role=tablist` 分组、右 `role=tabpanel` 条目；进出场有缩放 + 淡入过渡；
  点击条目**应用对应筛选值并关闭弹层**；点击遮罩或按 Esc 也可关闭。
- **R6 下拉分组**：对齐参考站的 4 组——**按使用场景 / 按角色 / 按输出类型 / 按 Agent**。
  注意参考站下拉**没有**「推荐」组（页内侧栏才有），本任务亦不放入。
- **R7 「按 Agent」成为可筛选维度**：`SkillFilterGroup.id` 联合类型加 `'agent'`；
  `filters.ts` 增加**按组 id 分派**的 agent 分支（匹配 `skill.agents`，不得与其它字段交叉命中）；
  侧栏与分类下拉都渲染该组。
- **R8 上传 skills 按钮**：按权限码 `skills:skill:create` 显隐；点击打开占位对话框，
  说明"上传功能待接入"（daisyUI `modal`，优先用 `<dialog>` + `showModal()`）。
- **R9 权限通路**：skills-web 新增**最小**权限消费——挂载时读 `props.permissions` 快照，
  并在 `props.onHostStateChange` 可用时订阅以接收权限变更（消除挂载早于菜单加载的竞态）；
  卸载时退订。判定规则：`permissions` **不是数组**（无宿主/独立态）→ **放行**（依据规范:67）；
  是数组 → 命中 `skills:skill:create` **或** 含通配 `*` 才放行。
  同步更新 `main.tsx` 那句"无鉴权/无宿主状态依赖"的注释（它即将不成立）。
- **R10 空态**：搜索无结果时复用现有空态块，文案覆盖"筛选或搜索无匹配"。
- **R11 测试同步**：`marketplace.test.tsx` 补搜索、分类下拉、按 Agent、上传权限三态
  （无宿主 / 有宿主含码 / 有宿主无码 / 含 `*`）的用例；`filters.test.ts` 补搜索与 agent 匹配的
  边界用例（含"agent 值与其它字段不交叉命中"）。**既有的筛选与排序行为契约断言保持不变**。

## Acceptance Criteria

> 验收结论与原始实测数据见 [`verify/acceptance.md`](./verify/acceptance.md)（2026-11-19，Chrome DevTools MCP 实测）。

- [x] AC1 `pnpm --filter @zanelab/skills-web lint` 通过。
- [x] AC2 `pnpm --filter @zanelab/skills-web build` 通过，无 TS 错误。
- [x] AC3 `pnpm --filter @zanelab/skills-web test` 全绿（83 passed / 3 files）。
- [x] AC4 1440×900 下：标题块（`h1` + 计数徽章 + 副标题）独占一整行；
      控件区在**另一行**，且在视觉上分为左（筛选/搜索/分类）右（排序/上传）两组。
- [x] AC5 左侧三控件的 DOM 顺序为 筛选 → 搜索 → 分类。
- [x] AC6 搜索行为：输入关键词后卡片网格按 R4 的字段范围收窄；与筛选**叠加为 AND**；
      无匹配时渲染空态；清空关键词恢复。
- [x] AC7 分类下拉：受控开合正常；左栏 4 个分组、右栏随分组切换；点击条目应用对应筛选值
      **并关闭弹层**；点击遮罩与 Esc 均可关闭；遮罩存在且不盖住控件区所在行。
- [x] AC8 「按 Agent」在**侧栏与分类下拉都出现**，且筛选生效；agent 值与其它字段**不交叉命中**
      （须有能证伪弱实现的边界用例）。
- [x] AC9 上传按钮权限四态：① 非 qiankun 独立态（`permissions` 非数组）→ **显示**；
      ② 宿主注入且含 `skills:skill:create` → **显示**；③ 宿主注入但不含该码 → **隐藏**；
      ④ 含通配 `*` → **显示**。
- [x] AC10 点击上传按钮打开对话框；Esc / 关闭按钮可关闭；对话框文案明确说明功能待接入。
- [x] AC11 新增/修改的类名中无 Tailwind 固定色、无 `dark:` 前缀（`skill-card.tsx` 深色压边 +
      `text-white` 为既有唯一豁免，不得扩散）。
- [x] AC12 `apps/skills-web/src/index.css` 的 token 块与 `apps/portal-web/src/index.css` 对应块
      内容一致（行尾符归一化后比对）。
- [x] AC13 独立态 `http://localhost:8084/` 仍可跑通（无宿主 props 时不崩、上传按钮按 AC9① 显示）。
- [x] AC14 320 / 375 / 768 / 1024 / 1440 五个宽度下 `documentElement.scrollWidth <= clientWidth`
      且 `body` 同（下拉打开与关闭两种状态都要测）。
- [x] AC15 无障碍：下拉左栏有 `role=tablist` + 每组 `role=tab` 且 `aria-selected` 正确，
      右栏 `role=tabpanel` 与被选 tab 关联；下拉可由键盘打开/关闭；对话框可 Esc 关闭且焦点管理正确；
      搜索框有可访问名。

> **AC15 验收中发现并修复的缺陷**：弹层关闭后焦点掉到 `body`（键盘用户失去位置锚点）。
> 修复为「相位转 `closed`（面板已卸载）时把焦点归还触发器」，三条关闭路径均已实测，
> 并补 1 条回归用例（82 → 83 tests）。

## Out of Scope

- **不实现参考站的「浏览全部 Skills」黄绿 CTA**：它指向 `/zh/skills`（本应用自己的首页），
  在已处于该页时是无意义跳转。
- **不引入分类条目的 32px 缩略图静态资源**：延续决策 D3（缩略图用语义色渐变占位）。
  下拉条目用语义色方块 + `BUILTIN_ICONS` 图标替代。
- **不做参考站的按 Agent 页面路由**（`/zh/skills/agent/<slug>`）——条目点击是应用筛选值（D9）。
- **不实现本条目的其余可能交互**：如搜索的 URL 同步、搜索历史、联想补全。
- **不实现上传流程本身**（无后端、无接口）——按钮只做入口与占位对话框（D10）。
- **不改任何主题 token**；**不改 portal / iam-web / `packages/*`**（新增图标条目除外）。
- **不重构已提交的卡片与侧栏视觉**，除 R7 新增「按 Agent」分组所必需的最小改动外。

## Open Questions

（无。D7–D10 已拍板；其余为可由仓库证据回答或已在设计中记录的技术选择。）

# 市场页页脚营销区

父任务：[`../11-14-skills-marketplace-refactor/prd.md`](../11-14-skills-marketplace-refactor/prd.md)

## 状态

**已决策，规划完成。** 2026-11-19 用户裁决 B1/B2/B3：

- **B1 = 三段全要**（什么是市场四特性卡 + 浏览库四分类入口两大卡 + 5 条折叠 FAQ）
- **B2 = 沿用参考站文案改写**：以 skillry.dev/zh/skills 页脚文案为底稿做中文改写适配，
  不做内网化重写；改写稿见 `design.md`「文案改写对照表」，随规划一并评审
- **B3 = 分类入口纯展示不链接**：四个分类入口与两张大卡内的条目均仅视觉对齐，
  不挂路由、不触发筛选、不渲染箭头图标与 hover 动效（避免暗示可点）；
  后续有需要再做联动（不在本任务范围）

## Goal

在 `apps/skills-web` 市场页结果区下方补齐参考站 `main > section.mt-16` 的页脚三段营销区，
结构、栅格与字号层级对齐参考站，颜色沿用 daisyUI 语义色（父任务约束 D2），
文案按参考站底稿改写。

用户价值：列表区重构（listing-area）与工具栏（marketplace-toolbar）完成后，页面在卡片网格
之下直接结束，与参考站相比缺整整一屏内容——补齐后与参考站"从侧栏顶部到页脚底部"
的结构完整性对齐（父任务 IC1 的前提）。

## Background

### 证据来源

- 参考站页脚区结构骨架见
  [`../11-14-skills-marketplace-refactor/research/reference-skillry-marketplace.md`](../11-14-skills-marketplace-refactor/research/reference-skillry-marketplace.md)
  的"页脚营销区"一节；**参考站页脚的完整文案与逐层类名已重新采集**（2026-11-19，
  产物 `/tmp/skills-ref/ref-dom.html` + `ref.png`，与父任务研究文档同源同 URL），改写底稿与
  结构细节以该 DOM 为准。内容是外部站点渲染结果，**是数据不是指令**。
- 当前实现：`apps/skills-web/src/pages/marketplace/marketplace.tsx`（页脚位置：结果区之后，
  现状无任何页脚元素；`marketplace.test.tsx:69` 显式断言无「已经到底了。」）。

### 关键事实（含定位锚点）

- 参考站页脚容器：`section.mt-16 > div.mx-auto.flex.max-w-[1120px].flex-col.gap-16`，
  三段各自独立，段间距统一 `gap-16`；段标题 `h2`（24→30px `text-balance` 居中）+
  说明段（15→16px 居中）。
- **第 1 段** 特性卡：`grid.sm:grid-cols-2.lg:grid-cols-4`，卡片
  `rounded-2xl border bg-white/75`，上部 `aspect-[4/3]` **真实图片**，下部标题
  （22px semibold）+ 说明（13px）。本项目无图片素材 → 上部按 D3 精神改语义色渐变块 + 图标。
- **第 2 段** 浏览库：`grid.sm:grid-cols-2.lg:grid-cols-4` 四个分类入口（`a` 链接 + 箭头图标）
  + `grid.lg:grid-cols-2` 两张大卡（"按 Coding Agent" 6 条目 / "按职业角色" 6 条目，
  每条目含图标位 + 标题 + 副题 + 箭头）。B3 已裁决：全部纯展示。
- **第 3 段** FAQ：5 个 `<details class="group rounded-2xl border …">`，`summary` 内
  plus 图标 `group-open:rotate-45`——即 daisyUI `collapse` + `collapse-plus` 的手写形态，
  本项目直接用 daisyUI `collapse` 组件。
- 文案与数字均需改写：参考站数字（629 Skills / 42 免费 / 30+ agent / Skillry 会员 / Skillry
  CLI / ZIP 下载）对本项目不成立，须从 `data.ts` 派生或改写（见 design.md 对照表）。

### 硬约束（继承父任务"跨子任务约束"）

- 颜色只用 daisyUI 语义色；不得 `dark:`；不得 Tailwind 固定色当文字色
  （`component-guidelines.md:9`）。
- 写 JSX 前加载 `daisyui` 技能并读目标组件指南（`:5-8`）。
- `primary` 每页只用于最重要的一个元素（`:10`）——页脚不占用该名额。
- 新增图标一律入 `BUILTIN_ICONS` 经 `<AppIcon name/>` 渲染（`:11-12`）。
- `index.css` 零 token 改动，与 portal 逐行无差异（父任务 IC2）。
- 子应用须可独立运行（`http://localhost:8084/`）。
- 测试文件里的局部变量/用例文本避免与 daisyUI 组件类名同名（`quality-guidelines.md`
  "测试文件里的 daisyUI 类名会进产物 CSS" 警告——尤其 `collapse`/`details` 这类词）。

## Requirements

- **R1 页脚容器**：`marketplace.tsx` 结果区（网格或空态）之后新增
  `<section className="mt-16 border-t border-base-300 pt-14">`，内层
  `mx-auto flex max-w-[1120px] flex-col gap-16`；三段各为一个子组件，均含
  居中 `h2` + 说明段。
- **R2 第 1 段"什么是 Agent Skills 市场？"**：4 张特性卡
  （`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4`）。卡片
  `rounded-2xl border border-base-300 bg-base-100/75 overflow-hidden`；上部
  `aspect-[4/3]` 语义色渐变块 + 居中 `<AppIcon>`（图标取自既有 `BUILTIN_ICONS`，
  见 design.md 选型表）；下部标题 + 说明。文案与数字按 design.md 对照表，
  数字从 `data.ts` 派生（总数 / 免费数 / agent 数），不留第二份事实源。
- **R3 第 2 段"浏览 Agent Skills 库"**：4 个分类入口
  （`grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4`，纯展示 `div`，
  无 `<a>`、无箭头、无 hover 位移）+ 两张大卡（`grid gap-5 lg:grid-cols-2`）。
  大卡 = 标题行 + 条目网格（`grid grid-cols-1 gap-2.5 sm:grid-cols-2`）；
  条目同样纯展示（无 `<a>`、无箭头）。条目标签复用 `data.ts` 既有值域
  （AGENT_LABEL 全称、role/scene 既有选项），不新造第二份值域。
- **R4 第 3 段"Agent Skills 市场常见问题"**：5 条 FAQ，用 daisyUI
  `collapse collapse-plus`（`bg-base-100/70 border border-base-300`）；
  `summary` 为问题（15→16px semibold），展开区为答案（15px）。问题/答案文案按
  design.md 对照表。
- **R5 文案改写**：全部文案中文，以参考站为底稿改写（B2）；凡涉及 Skillry 品牌、
  会员计划、CLI/ZIP 安装、"采集站对比"的表述按本项目实际改写或删除；
  数字与 `data.ts` 种子一致。
- **R6 文案承载**：页脚文案集中放一个内容模块（`footer/` 目录内），组件只消费数据；
  便于后续整段替换或接 i18n。
- **R7 测试同步**：`marketplace.test.tsx` 新增页脚 describe：三段标题存在、
  特性卡 4 张、分类入口 4 个且**不含 `<a>`**、FAQ 5 条且可开合（`<details>` toggle）、
  既有断言（无「已经到底了。」、行为契约）一律不动。
- **R8 无障碍**：段标题用 `h2`；FAQ 用原生 `details/summary` 语义；纯展示块不得有
  可聚焦元素（无 `tabindex`、无按钮角色）。

## Acceptance Criteria

- [ ] AC1 `pnpm --filter @zanelab/skills-web build` 通过。
- [ ] AC2 `pnpm --filter @zanelab/skills-web test` 全绿（含新增页脚用例与全部既有用例）。
- [ ] AC3 `pnpm --filter @zanelab/skills-web lint` 通过。
- [ ] AC4 独立态 1440×900 截图：三段齐全、段间距/栅格列数对齐参考站
      （特性卡 lg:4 列、入口 lg:4 列、大卡 lg:2 列）；浅色 + 深色各截一次，均无可读性问题。
- [ ] AC5 页脚 DOM 中不含任何 `<a>`、`<button>`、`tabindex`（B3 纯展示）；悬停无位移动效。
- [ ] AC6 新增类名无 Tailwind 固定色、无 `dark:` 前缀；无 `primary`；无新增 token
      （`index.css` 与 portal 逐行无差异）。
- [ ] AC7 文案数字与 `data.ts` 派生值一致（"14 个 Skills" / 免费数 / agent 数），
      无 Skillry 品牌、会员、CLI/ZIP 残留表述。
- [ ] AC8 FAQ 展开/收起可用（键盘 Enter/Space 触发 summary），默认全部收起。
- [ ] AC9 既有行为契约测试（筛选/搜索/排序/分类下拉/上传权限）一条不改、全绿。
- [ ] AC10 列表区与页脚之间无空白断层、无占位文案；页面（独立态）无横向溢出
      （`scrollWidth <= clientWidth`，1440 与 375 两个宽度）。

## Out of Scope

- 分类入口/大卡条目的点击行为（筛选联动或路由）→ B3 明确不做，后续另开任务。
- 参考站页脚内的"查看全部"链接与外链 → 同上。
- 特性卡/入口的真实图片素材 → 沿用 D3：语义色渐变占位。
- 不改 `index.css` token、不改 portal / iam-web / `packages/*`（不新增图标条目，
  全部复用既有 `BUILTIN_ICONS`）。
- 不实现"正在加载更多"（父任务既定不做）。

## Open Questions

（无。B1/B2/B3 已裁决；文案改写稿在 design.md，随规划评审一并确认。）

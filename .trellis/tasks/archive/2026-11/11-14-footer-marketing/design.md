# 设计：市场页页脚营销区

[PRD](./prd.md)｜父任务 [PRD](../11-14-skills-marketplace-refactor/prd.md)｜
参考站证据 [`research/reference-skillry-marketplace.md`](../11-14-skills-marketplace-refactor/research/reference-skillry-marketplace.md)
（结构骨架）；完整页脚文案与类名以 `/tmp/skills-ref/ref-dom.html`（2026-11-19 重新采集）为准。

## 架构与边界

改动集中在 `apps/skills-web/src/pages/marketplace/`，不触其它 app 或 `packages/*`。

| 文件 | 改动性质 |
|---|---|
| `marketplace.tsx` | 结果区之后挂 `<MarketplaceFooter />`（一处 import + 一处 JSX） |
| `footer/footer.tsx`（新增） | `<section>` 容器 + 三段子组件的编排 |
| `footer/overview-section.tsx`（新增） | 第 1 段：什么是 Agent Skills 市场 + 4 特性卡 |
| `footer/browse-section.tsx`（新增） | 第 2 段：浏览库 + 4 入口 + 2 大卡 |
| `footer/faq-section.tsx`（新增） | 第 3 段：5 条 daisyUI `collapse` FAQ |
| `footer/content.ts`（新增） | **文案与派生数字的唯一承载**（R6）；从 `../data.ts` 派生计数 |
| `marketplace.test.tsx` | 新增"页脚"describe（R7）；既有用例一条不改 |
| `index.css` | **不改**（零 token 改动） |

目录名避讳：不用 `footer.tsx` 命名组件变量为 `footer`？——可以，`footer` 不是 daisyUI
组件类名；但**测试里不得出现名为 `collapse`/`tab`/`drawer` 的局部变量**（quality-guidelines
警告：测试源码里的 daisyUI 类名会被 Tailwind 扫描进产物 CSS）。

## 参考站 → daisyUI 语义类名转译

延续两个兄弟子任务的转译原则：保留结构/层级/节奏，颜色表达式换成语义色。

| 位置 | 参考站 | 本项目落地 | 说明 |
|---|---|---|---|
| 页脚容器 | `section.mt-16` | `section mt-16 border-t border-base-300 pt-14` | 参考站 `border-t` 挂在 section（骨架文档 ：178） |
| 三段容器 | `mx-auto flex max-w-[1120px] flex-col gap-16` | 原样保留 | 非颜色的任意值允许（同 listing-area 对 `w-[236px]`→`lg:w-60` 的裁量：此处 1120 是结构宽度，保留） |
| 段头 | `max-w-[680px] text-center`，h2 `text-[24px] sm:text-[30px] font-semibold` | 原样保留 + `text-base-content` | 字号层级直接对齐 |
| 段说明 | `text-[15px] sm:text-[16px] text-black/60` | `text-base-content/60` | 语义色 |
| 特性卡 | `rounded-2xl border-black/[0.08] bg-white/75 hover:-translate-y-0.5` | `rounded-2xl border border-base-300 bg-base-100/75`（**去 hover 位移**，纯展示块不暗示可点） | B3 同理延伸 |
| 特性卡图片区 | `aspect-[4/3]` 真实图 | `aspect-[4/3]` 语义色渐变块 + 居中 `<AppIcon className="size-10">` | D3：无图片素材，沿 skill-card 的 `from-<tone>/25 to-<tone>/5` 做法 |
| 特性卡标题 | `text-[22px] font-semibold` | 原样 + `text-base-content` | — |
| 特性卡说明 | `text-[13px] leading-5 text-black/60` | `text-[13px] leading-5 text-base-content/60` | — |
| 分类入口 | `a` + `rounded-2xl border p-3.5` + 图标位 + 箭头 | `div rounded-2xl border border-base-300 bg-base-100/75 p-3.5`，图标位用渐变块 + `<AppIcon>`，**无箭头** | B3 |
| 入口图标位 | `img size-[52px] rounded-xl` | `size-[52px] rounded-xl` 渐变块 + `<AppIcon>` | 同 D3 |
| 入口标题/副题 | `text-[15px] font-semibold` / `text-[12.5px] text-black/55` | `text-[15px] font-semibold text-base-content` / `text-[12.5px] text-base-content/55` | — |
| 大卡容器 | `rounded-2xl border bg-white/60 p-5` | `rounded-2xl border border-base-300 bg-base-100/60 p-5` | — |
| 大卡组标题行 | `text-[12px] font-semibold uppercase tracking-[0.1em] text-black/50` + "查看全部"链接 | `text-[12px] font-semibold uppercase tracking-[0.1em] text-base-content/50`，**右侧"查看全部"不实现**（B3/Out of Scope） | — |
| 大卡条目 | `a rounded-xl border bg-white/85` + 图标位 + 箭头 | `div rounded-xl border border-base-300 bg-base-100/85 px-3 py-2.5`，**无箭头** | B3 |
| FAQ 条 | `<details class="group rounded-2xl border bg-white/70 px-5 py-4">` + summary + plus `group-open:rotate-45` | **daisyUI `collapse collapse-plus bg-base-100/70 border border-base-300`**，箭头语义由组件自带 | 见组件选型 |
| FAQ 问题 | `text-[15px] sm:text-[16px] font-semibold` | `summary` + `text-[15px] sm:text-[16px] font-semibold text-base-content` | — |
| FAQ 答案 | `pt-2.5 text-[15px] leading-6 text-black/60` | 展开区 `text-[15px] leading-6 text-base-content/60` | — |

## 组件选型（已按 daisyUI 组件发现协议确认）

| 需求 | 候选 | 选定 | 依据 |
|---|---|---|---|
| FAQ 折叠 | 手写 `<details>` + `group-open:rotate-45` / `collapse` | **`collapse collapse-plus`** | 参考站手写的正是 `collapse-plus` 的形态（`components/collapse.md`：含 `collapse` 类的 `details` 即是它）；用组件免维护手写类 |
| 特性卡/入口/条目 | `card` / `btn` / 自拼 | **自拼（Tailwind 工具类）** | 参考站不是 daisyUI card 形态；入口**不可点**故不得用 `btn`/`a`（B3）；与 listing-area"卡片不用 card"同一判断 |
| 图标 | 内联 SVG / `AppIcon` | **`<AppIcon>`，全部复用既有 `BUILTIN_ICONS`** | `component-guidelines.md:11-12`；本任务**零新增图标条目** |

`BUILTIN_ICONS` 复用清单（已核对 `packages/ui/src/icon/builtin-icons.ts` 全部命中）：
`presentation`（幻灯片/PPT 特性卡）、`monitor`（网页）、`video`（视频）、`photo`（图像）、
`bookmark`（精选/收藏）、`user`（按角色大卡条目图标位）、`circle-help`（FAQ 段图标位，可选）。
特性卡 4 张建议配对：`629 个 Skills`→`table` 或 `circle-check-big`、`免费`→`download`、
`agent`→`components`、`提示词`→`corner-down-left`（实现时按视觉观感微调，选型不新增）。

## 文案改写对照表（B2 底稿 → 本项目改写稿）

数字从 `data.ts` 派生：总数 `SKILLS.length`=14、免费数 `SKILLS.filter(free).length`=12、
agent 数 `Object.keys(AGENT_LABEL).length`=4。以下 `%d` 为运行时插值，不写死。

### 第 1 段：什么是 Agent Skills 市场？

| 参考站底稿 | 改写稿 |
|---|---|
| Skillry 的每个 Skill 均由团队原创自研并实测，让 Claude Code、Codex、Cursor 或 OpenClaw 直接生成高质量 PPT、网站、视频与图片。 | 市场内的每个 Skill 均附带演示说明，让 Claude Code、Codex、Cursor、Antigravity 以及所有能读取 SKILL.md 的 Agent 直接生成网页、幻灯片、视频与图像。 |
| 629 个 Skills | `%d 个 Skills`（=14） |
| 团队原创自研，附真实成品预览 | 附演示数据与用法说明 |
| 42 个免费 | `%d 个免费`（=12） |
| 每个分类都有免费 Skills，或开通会员解锁全部 | 每个输出类型都有免费 Skills，安装与运行方式一致 |
| 30 多个 agent | `%d 个 Agent`（=4） |
| Claude Code、Codex、Cursor、OpenClaw 等 | Claude Code、Codex、Cursor、Antigravity 等（复用页面副标题口径） |
| 1 条提示词 | 同一入口管理 |
| 粘贴给 agent，自动安装 Skill 文件夹 | 在门户内浏览、筛选与安装 Skills |

### 第 2 段：浏览 Agent Skills 库

| 参考站底稿 | 改写稿 |
|---|---|
| 按你需要的成品类型、你正在使用的 Coding Agent 或你的角色浏览现成 Skills。 | 按你需要的输出类型、你正在使用的 Coding Agent 或你的角色浏览现成 Skills。 |
| PPT 与演示文稿 / 融资演讲、发布会与汇报 | 幻灯片与演示 / 融资路演、课堂教学与汇报 |
| 网站与前端设计 / 落地页、产品界面与作品集 | 网页与前端设计 / 落地页、产品界面与作品集（沿用） |
| 视频与动态图形 / 产品宣传片与动态解说视频 | 视频与动态图形（沿用）/ 产品宣传片与口播脚本 |
| 图片与视觉生成 / 社论插画、海报与社交卡片 | 图片与视觉生成 / 品牌插画、海报与社交卡片 |

大卡两组（"按 Coding Agent" / "按职业角色"）：

- **按 Coding Agent**：条目标签 = `AGENT_LABEL` 四个全称（Claude Code / Codex /
  Antigravity / Cursor），副题统一"支持 SKILL.md 的 Agent"。参考站的
  "所有支持 SKILL.md 的 agent" 汇总条目**不实现**（它是个外链）。
- **按职业角色**：条目标签复用 `FILTER_GROUPS` role 组既有值域（内容创作者 / 创始人 /
  设计师 …，实现时取前 6 个或全部 8 个按 `sm:grid-cols-2` 排布），副题可省略或复用场景词。
  **不新造值域**（单一事实源约束）。

### 第 3 段：Agent Skills 市场常见问题（5 条）

| # | 问题（参考站 → 改写稿） | 答案要点（参考站 → 改写稿） |
|---|---|---|
| 1 | 什么是 Agent Skills 市场？（沿用） | 即装即用的 SKILL.md 技能包；本市场提供演示数据与用法说明，适配 Claude Code、Codex、Cursor、Antigravity 等支持 SKILL.md 的 Agent。 |
| 2 | Skills 免费吗？ | 每个输出类型都有可直接安装的免费 Skills；免费与付费 Skills 的安装与运行方式完全一致。**删**"会员计划"。 |
| 3 | 怎么安装 Skill？ | 打开一个 Skill，按其用法说明交给你的 agent 安装到对应目录。**删**"下载 ZIP / Skillry CLI"。 |
| 4 | 支持哪些 Coding Agent？ | 每个 Skill 都是标准的 SKILL.md 文件夹，可在 Claude Code、Codex、Cursor、Antigravity 等支持 Agent Skills 的 Agent 中运行。 |
| 5 | ~~和 GitHub 清单/采集站有什么不同~~ | **换题**（对比对象不适用）：改为"如何为市场补充新的 Skill？"——通过门户的上传入口提交（见页面上传按钮），审核通过后上架展示。 |

## 数据流

`footer/content.ts` import `../data.ts` 的 `SKILLS` / `AGENT_LABEL` / `FILTER_GROUPS`，
导出三段各自的纯数据（段标题、说明、卡片数组、FAQ 数组）。组件零文案、零数字字面量。
这样后续接 i18n 或真后端时只动一个文件。

## 权限 / 交互

- 页脚为纯展示区，**不消费权限**（`Permission` 不出现）；不新增 state、不新增事件。
- 无跨组件状态提升（B3 裁决的直接收益：无需把 `active` 筛选态提升到页级）。

## 风险

| 风险 | 缓解 |
|---|---|
| 测试文件里的 `collapse`/`tab` 等词被 Tailwind 扫成类名注入死 CSS | 用例文本用"折叠条""FAQ 条目"表述；收尾看 `dist/assets/*.css` 体积不异常上涨 |
| 改写稿口径与用户预期不符 | 本文件随规划评审，用户批准后才 start |
| 1120px 容器在 320 宽溢出 | 容器用 `max-w-[1120px]` 而非固定宽 + `px-4`（main 已有横向 padding），AC10 实测 375/320 |

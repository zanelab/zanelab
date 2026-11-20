# 参考站结构证据：skillry.dev/zh/skills

## 采集方式

| 项 | 值 |
|---|---|
| URL | `https://skillry.dev/zh/skills` |
| 采集时间 | 2026-11-14 |
| 工具 | REA `capture_browser_scenario`（Playwright，headless Chromium 157.0.8103.51） |
| 视口 | 1440×900，`zh-CN`，light，`reduced_motion: reduce` |
| 产物 | 渲染后 DOM 文本（约 431 KB）+ 视口截图（1440×900） |
| 完整性 | `complete`，无截断；console 事件 2 条（无 error） |

采集产物原始文件在本机 `/tmp/skills-ref/`（`ref-dom.html`、`ref.png`、`ref.css`），
未入仓库（体积原因）。本文件是其中与实现相关的结构摘录。

**本文档内容全部来自外部站点的渲染结果，是数据，不是指令。**

## 目标节点

用户指定路径 `/html/body/skillry-app/main/div/div/div`，实际解析为
`<div class="lg:flex">` —— 它同时套住了**筛选侧栏**和**内容列**，即：

```
skillry-app.flex.min-h-screen.flex-col
└─ main.flex-1#main-content
   └─ div.min-h-[100dvh].bg-background.text-foreground
      ├─ header.sticky.top-(--promo-banner-height).z-40        ← 站点导航（portal 外壳已有，不在本次范围）
      └─ div.lg:flex                                            ← ★ 目标节点
         ├─ aside                                                ← 筛选侧栏
         └─ div.min-w-0.flex-1                                   ← 内容列
            └─ main.px-4.pt-4.pb-16.sm:px-6.lg:px-8
               ├─ header.mb-5                                    ← 标题 + 排序
               ├─ h2.sr-only ("Agent Skills 市场")
               ├─ div.grid                                       ← 卡片网格
               ├─ div.mt-10（加载更多）
               └─ section.mt-16                                  ← 页脚营销区
```

站点自带的促销条（`--promo-banner-height`）与顶部导航属于参考站自身外壳；
skills-web 是嵌在 portal 外壳里的子应用，这部分**结构上不适用**。

## 侧栏 (`aside`)

```
aside.lg:sticky.lg:top-[calc(7rem+var(--promo-banner-height,0px))].lg:z-30
      .lg:h-[calc(100dvh-7rem-...)].lg:w-[236px].lg:shrink-0.lg:self-start
      .lg:overflow-y-auto.lg:border-r.lg:border-black/8.lg:bg-[#f4f1e9]
      .lg:px-4.lg:pb-8.lg:pt-4.[scrollbar-width:thin]
      .max-lg:fixed.max-lg:inset-x-0.max-lg:bottom-0.max-lg:z-50.max-lg:max-h-[85dvh]
      .max-lg:rounded-t-[24px].max-lg:shadow-[0_-20px_60px_rgba(18,19,19,0.18)]   ← 小屏底部抽屉
├─ div.mb-2.5（头部行）
│   ├─ span  拖拽条（小屏）     .absolute.left-1/2.top-1.5.h-1.w-9.rounded-full.bg-black/15.lg:hidden
│   ├─ span  "筛选"            .flex-1.text-[12px].font-semibold
│   ├─ button 收起侧边栏        .grid.size-8.rounded-full.text-black/40….max-lg:hidden
│   └─ button 关闭筛选          .grid.size-8.rounded-full.text-black/45….lg:hidden
├─ div.flex.flex-col.gap-4                                     ← 4 个分组
│   ├─ div                                                     推荐（首组无分隔线）
│   │   ├─ p   .px-2.pb-1.5.text-[11px].font-semibold.tracking-[0.01em].text-black/40
│   │   └─ div.flex.flex-col.gap-px                            ← 选项容器
│   ├─ div.border-t.border-black/8.pt-4                        按输出类型
│   ├─ div.border-t.border-black/8.pt-4                        按角色
│   └─ div.border-t.border-black/8.pt-4                        按使用场景
└─ div.sticky.bottom-0.mt-5（小屏确认条）.lg:hidden
    └─ button.h-11.rounded-full.bg-[#121313].text-white        "查看 620 个 Skills"
```

### 侧栏选项行（重复单元）

```
label.relative.block
├─ input.peer.absolute.inset-0.z-10.size-full.cursor-pointer.appearance-none.opacity-0
│         .peer-focus-visible:ring-2…                          [type=checkbox]
└─ span.flex.w-full.items-center.gap-2.rounded-lg.px-2.py-[5px]
        .text-left.text-[12.5px].leading-[19px].transition-colors
        .cursor-pointer.hover:bg-black/[0.055].text-black/62
   ├─ span  .grid.size-[15px].shrink-0.place-items-center.rounded-[5px].border
   │        .transition-colors.border-black/16.bg-white/50      ← 方形复选框（非圆形）
   ├─ span  .min-w-0.flex-1.truncate                            "免费"
   └─ span  .shrink-0.text-[11px].tabular-nums.text-black/32   计数 "42"
```

**前置图标（按分组而异）**：`按输出类型` 分组的四个选项行各有一个 **14px 前置图标**，
位于复选框与标签之间；`推荐` 分组无图标（上面的骨架取自该组，故不含图标）。
实测（2026-11-14 从同一份 DOM 复核）：

| 选项 | 图标 class |
|---|---|
| 网页 (116) | `tabler-icon tabler-icon-device-desktop size-[14px] shrink-0` |
| 幻灯片 (61) | `tabler-icon tabler-icon-presentation size-[14px] shrink-0` |
| 视频 (360) | `tabler-icon tabler-icon-video size-[14px] shrink-0` |
| 图像 (83) | `tabler-icon tabler-icon-photo size-[14px] shrink-0` |

侧栏头部两个图标按钮（同一份复核）：`tabler-icon-layout-sidebar-left-collapse`
（桌面收起）、`tabler-icon-x`（小屏关闭）。

分组标题文案依次为：`推荐` / `按输出类型` / `按角色` / `按使用场景`。
首组两个选项：`免费`(42)、`精选`(109)。

## 内容列

### 标题行 `header.mb-5.flex.flex-wrap.items-end.justify-between.gap-x-6.gap-y-3`

```
├─ div.flex.min-w-0.items-start.gap-3
│   └─ div.min-w-0
│      ├─ div.flex.flex-wrap.items-center.gap-x-2.5.gap-y-1
│      │   ├─ h1   .text-xl.font-semibold.tracking-[-0.025em].sm:text-2xl   "Agent Skills 市场"
│      │   └─ span .inline-flex.h-6.items-center.rounded-full.bg-black/[0.06].px-2.5
│      │          .text-[12px].font-semibold.tabular-nums                    "620 个 Skills"
│      └─ p    .mt-1.text-[13px].text-black/50                              副标题（一段）
└─ div.flex.w-full.min-w-0.items-center.gap-2.sm:w-auto
    ├─ div[role=tablist][aria-label=排序]   .flex.gap-0.5.rounded-full.border.border-black/10
    │       .bg-white/60.p-1.sm:flex-none
    │   ├─ button[role=tab][aria-selected]  h-8.rounded-full.px-3.5.text-[13px].font-semibold
    │   │   选中态 .bg-[#121313].text-white.shadow-[0_4px_12px_rgba(18,19,19,.18)]
    │   │   未选中 .text-black/55.hover:bg-black/[0.05]
    │   │   文案：推荐 / 最新发布 / 热门 / 评分最高
    └─ button.lg:hidden（小屏筛选入口） .inline-flex.h-9.rounded-full.border.border-black/14
```

### 卡片网格

```
div.grid.grid-cols-1.items-stretch.sm:grid-cols-2.gap-4.lg:grid-cols-3.xl:grid-cols-4
└─ div.min-w-0.[contain-intrinsic-size:auto_240px].[content-visibility:auto]   ← 每卡外层包裹
```
（采集时渲染 24 张；页面标注总数 620）

### 单张卡片

```
article.relative.flex.h-full.flex-col.transition-transform.duration-300
        .group-hover:-translate-y-1.group-focus-within:-translate-y-1
├─ a.flex.flex-1.flex-col.rounded-2xl.focus-visible:ring-2        [href=/zh/skills/<slug>]
│  ├─ div.relative.overflow-hidden.rounded-2xl.border.border-black/10
│  │  ├─ div.aspect-video.overflow-hidden.bg-[#f7f7f5]            ← 缩略图容器 16:9 满铺
│  │  │   ├─ img.absolute.inset-0.size-full.object-cover          ← 真实预览图 1280×720 webp
│  │  │   └─ div.absolute.inset-0.bg-gradient-to-t.from-black/20.via-transparent.to-white/5
│  │  ├─ span 免费徽章  .absolute.left-2.5.top-2.5.z-20.inline-flex.h-6.items-center
│  │  │                .rounded-full.border.px-2.text-[10px].font-semibold.uppercase
│  │  │                .border-black/15.bg-[#f4ff71].text-[#121313]          ← 黄底
│  │  ├─ span 媒体类型  .absolute.right-2.5.top-2.5.z-10.grid.size-6.place-items-center
│  │  │                .rounded-full.bg-white/50.backdrop-blur-md.text-black/60
│  │  │                + span.sr-only ("视频"/"网页"/…)                       ← 右上圆形标
│  │  ├─ span 底部渐变  .absolute.inset-x-0.bottom-0.z-[15].h-16
│  │  │                .bg-[linear-gradient(to_top,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.6)_32%,rgba(0,0,0,0)_100%)]
│  │  └─ span 统计      .absolute.bottom-2.5.right-3.z-20.inline-flex.items-center.gap-2.5
│  │                   .text-[10px].font-semibold.tabular-nums.text-white
│  │                   .[text-shadow:0_1px_2px_rgba(0,0,0,0.5)]
│  │                   安装数 + 点赞数（各带 sr-only 说明）
│  └─ div.flex.items-center.gap-2.mt-1.5.h-6                       ← 标题行
│     ├─ h3   .min-w-0.truncate.text-[13px].font-medium.tracking-[-0.01em].text-black/65
│     └─ span.ml-auto.flex.shrink-0.items-center                   ← 右侧兼容 Agent 头像组
│        └─ span.flex.items-center
│           ├─ span ×4  .-ml-1.grid.size-4.shrink-0.place-items-center.rounded-full
│           │          .border.border-black/15.bg-[#f4f1e9].first:ml-0        ← 重叠圆形头像
│           └─ span   "+"  .text-[8px].font-semibold.tabular-nums.text-black/45
└─ div.pointer-events-none.absolute.inset-x-x.top-0.z-30.aspect-video   ← hover 操作层
   └─ div.absolute.right-2.5.top-2.5.flex.gap-1
      ├─ button 喜欢  .hidden.size-7.rounded-full.bg-white/50.backdrop-blur-md
      │              .hover:bg-[#f4ff71].group-hover:inline-flex              ← hover 才出现
      └─ button 收藏  同上
```

要点：**卡片本身没有背景与边框容器**——图片就是卡片（`rounded-2xl` + `border-black/10`），
标题在页面底色上另起一行。这与当前 skills-web 的 daisyUI `card`（`bg-base-100` + `border` +
`card-body` 内边距）是两种做法。

### 加载更多

```
div.mt-10.flex.min-h-20.items-center.justify-center
└─ button.rounded-full.border.border-black/14.bg-white/60.px-5.py-2.5.text-sm.font-semibold
          "正在加载更多 Skills…"
```

### 页脚营销区 `section.mt-16.border-t.pt-14`

三段独立内容，均由 `div.mx-auto.flex.max-w-[1120px].flex-col.gap-16` 承载：

1. **什么是 Agent Skills 市场？** —— `h2` 24→30px + 说明段 + `grid.sm:grid-cols-2.lg:grid-cols-4` 四张特性卡
   （`.rounded-2xl.border.border-black/[0.08].bg-white/75`）
2. **浏览 Agent Skills 库** —— `h2` + 说明段 + `grid.sm:grid-cols-2.lg:grid-cols-4` 四个**分类链接**
   （`a[href=/zh/skills/output/slides|web|video|image]`）+ `grid.lg:grid-cols-2` 两张大卡
3. **Agent Skills 市场常见问题** —— `h2` + 5 个 `<details class="group rounded-2xl border …">` FAQ

这段含大量需要新写的中文文案，且分类链接指向 skills-web 中不存在的路由。

## 参考站设计 token（仅备查，本任务不采用）

参考站是 shadcn 风格 token + Tailwind 4，浅色块：

| token | 浅色 | 深色 |
|---|---|---|
| `--background` | `#f4f1e9`（暖奶油） | `#121313` |
| `--foreground` | `#121313`（墨黑） | `#f4f1e9` |
| `--primary` | `#121313` | `#f4ff71` |
| `--accent` | `#f4ff71`（黄绿） | `#f4ff71` |
| `--card` | `#fbfaf6` | `#1b1c1c` |
| `--muted` | `#ebe7de` | `#252727` |
| `--muted-foreground` | `#666962` | `#a7aaa4` |
| `--border` | `#1213131f` | `#f4f1e924` |

文字色一律走 `black/xx`（深色则 `white/xx`）透明度。
**本任务已决定不采用这套色板**，沿用 skills-web 现有 daisyUI 语义色
（依据 `.trellis/spec/frontend/component-guidelines.md:9`：颜色只用 daisyUI 语义色）。
上表仅用于理解参考站的层级关系（例如"文字层级用透明度递减"这一手法）。

## 与当前实现的差异清单

| # | 维度 | 参考站 | 当前 skills-web | 位置 |
|---|---|---|---|---|
| 1 | 卡片容器 | 无容器，图片即卡片 | daisyUI `card bg-base-100 border` | `skill-card.tsx:29` |
| 2 | 缩略图 | `aspect-video`(16:9) 满铺真实图 | `m-3` + `aspect-[16/10]` 渐变占位 + 假浏览器窗口 | `skill-card.tsx:32-45` |
| 3 | 免费徽章 | 黄底 `#f4ff71` | `badge badge-primary`（蓝） | `skill-card.tsx:48` |
| 4 | 媒体类型圆标 | 右上 `size-6` 圆形标 | 无（该位置是 hover 放大按钮） | `skill-card.tsx:57-63` |
| 5 | 底部统计 | 黑渐变 + 10px 白字带 text-shadow | `bg-base-100/85` 色条 | `skill-card.tsx:65-74` |
| 6 | 卡片右侧 | 重叠 Agent 头像圆片 + "+" | `CC/CX/AG/CU` 文字 chip | `skill-card.tsx:81-91` |
| 7 | hover 操作 | 喜欢/收藏 两个圆钮 | 单个放大按钮 | `skill-card.tsx:57-63` |
| 8 | 卡片标题 | `text-[13px] font-medium`，在页面底色上 | `card-title text-sm`，在卡片体内 | `skill-card.tsx:78` |
| 9 | 复选框形状 | 15px 圆角方块 `rounded-[5px]` | `checkbox checkbox-primary`（**圆形**） | `filter-sidebar.tsx:48` |
| 10 | 筛选分组数 | 4 组（含"按使用场景"） | 3 组 | `data.ts:45-78` |
| 11 | 分组标题 | `text-[11px] font-semibold` | `text-xs font-medium` | `filter-sidebar.tsx:30` |
| 12 | 选项行字号 | 标签 12.5px / 计数 11px | `text-sm` / `text-xs` | `filter-sidebar.tsx:42,61` |
| 13 | 侧栏头部 | 收起 + 关闭 图标按钮 | "清除全部 ×" | `filter-sidebar.tsx:78-89` |
| 14 | 栅格列数 | `lg:3 xl:4` | `xl:3 2xl:4` | `marketplace.tsx:142` |
| 15 | 标题计数 | "620 个 Skills" | "显示 14 / 14 个 Skills" | `marketplace.tsx:104` |
| 16 | 已选筛选 chips | 无 | 有（`ActiveFilterChips`） | `marketplace.tsx:22-62` |
| 17 | 加载更多 | "正在加载更多 Skills…" | 无 | — |
| 18 | 页脚 | 三段营销区 + FAQ | "已经到底了。" | `marketplace.tsx:153-155` |
| 19 | 选项行前置图标 | "按输出类型"四行各有 14px 图标 | 无 | `filter-sidebar.tsx:34-67` |
| 20 | 首组标题 | `推荐` | 无标题（`title: ''`） | `data.ts:46-53` |

第 19、20 项为 2026-11-14 实现首轮后复核补入（初版差异清单遗漏）。第 19 项不需要新增图标：
`BUILTIN_ICONS` 已有 `monitor` / `presentation` / `video` / `photo` 四个对应字形。
第 20 项参考站确实有 `推荐` 标题，初版差异清单未列。

第 3 项（徽章配色）与第 9 项（复选框形状）的差异部分是**配色决策**的结果（本任务保留
daisyUI 语义色），部分是**结构决策**（方形 vs 圆形）。结构部分属于本次要改的范围。

---

## 附：顶部导航「分类」下拉（展开态）

2026-11-16 补采。planning 期抓的那份 DOM 是**折叠态**，弹层条件渲染故不存在
（`/html/body/div/div[2]` 命中 0）。本节的证据来自一次带点击的采集（同样是 REA
`capture_browser_scenario`，headless Chromium 157，1440×900，zh-CN，click 定位
`role=button name=分类`），产物在 `/tmp/skills-cat/`（`dom.html`、`category-open.png`）。

### 结构（折叠态不存在，展开后出现）

```
body
├─ skillry-app
├─ section
└─ div                              ← Base UI 门户容器（展开后才创建）
   ├─ div[role=presentation]        ← 全页遮罩
   │    .fixed.inset-x-0.top-[var(--storefront-header-bottom,4rem)].bottom-0.z-40
   │    .bg-background/70.backdrop-blur-[3px].saturate-[0.8]
   │    .transition-opacity.duration-150.data-ending-style:opacity-0…
   └─ div[role=presentation]        ← 定位器（位置/尺寸走 CSS 变量）
        .isolate.z-50.h-(--positioner-height).w-(--positioner-width)
        .max-w-(--available-width).transition-[top,left,right,bottom].duration-[0.35s]
        .ease-[cubic-bezier(0.22,1,0.36,1)]
        └─ nav                      ← 弹层本体
             .rounded-[20px].border.border-black/8.bg-popover
             .shadow-[0_28px_80px_rgba(18,19,19,0.18)]
             .transition-[opacity,transform,width,height,scale,translate].duration-[0.35s]
             .data-starting-style:scale-90.data-starting-style:opacity-0
             .data-ending-style:scale-90.data-ending-style:opacity-0
           └─ div.grid.w-[min(688px,calc(100vw-2rem))].grid-cols-[160px_minmax(0,1fr)].gap-2.5.p-2.5
              ├─ div[role=tablist][aria-label=分类]
              │    .flex.flex-col.gap-1.rounded-2xl.bg-muted.p-1.5          ← 左栏 160px
              │    ├─ button[role=tab] 选中态 .bg-card.shadow-[0_1px_0_…#f4ff71 无]
              │    │     .flex.w-full.items-center.justify-between.gap-2.rounded-xl.px-3.py-2.5
              │    │     .text-left.text-[13px].font-semibold.tracking-[-0.01em]
              │    │     id=desktop-category-tab-tasks    :: 按使用场景
              │    ├─ … roles    :: 按角色
              │    ├─ … outputs  :: 按输出类型
              │    └─ … agents   :: 按 Agent
              └─ section[role=tabpanel]
                   .flex.min-h-[296px].flex-col.rounded-2xl.border.border-black/[0.045].bg-muted/60.p-3
                   ├─ div.grid.grid-cols-2.content-start.gap-1.5
                   │    └─ a[href=/zh/skills/<dim>/<slug>]
                   │         .group.flex.h-11.items-center.gap-2.rounded-xl
                   │         .border.border-black/[0.05].bg-card/72.px-2.5.py-1.5
                   │         .text-[13px].font-medium
                   │         .hover:border-black/[0.12].hover:bg-card.hover:shadow-[0_4px_14px_…]
                   │       ├─ img .size-8.shrink-0.rounded-[9px].object-cover.ring-1.ring-black/5
                   │       │        .transition-transform.group-hover:scale-[1.06]   ← 32px 缩略图
                   │       └─ span .min-w-0
                   └─ a（CTA）
                        .group.mt-auto.inline-flex.min-h-10.w-fit.self-end.rounded-full
                        .bg-[#f4ff71].px-5.text-xs.font-semibold.text-[#121313]  :: 浏览全部 Skills
```

### 四个分组的实际条目（参考站）

| 分组 | 条目 |
|---|---|
| 按使用场景 | 网站与数字体验 / 产品发布与应用增长 / 品牌建立与视觉规范 / 客户交付与管理层汇报 / 社交内容与营销活动 / 科研出版与技术沟通 / 知识解释与教学 / 内容与编辑发布 |
| 按角色 | 内容创作者 / 创始人 / 电商卖家 / 设计师 / 顾问 / …（与页内筛选同源） |
| 按输出类型 | （与页内筛选同源） |
| 按 Agent | （支持/兼容的 Coding Agent） |

### 「点击效果」的实质

1. 页面整体被遮罩压暗并轻度模糊（`bg-background/70` + `backdrop-blur-[3px]` + `saturate-[0.8]`），
   遮罩从 header 底边开始、不盖 header。
2. 弹层从 header 下方以 `scale(0.9) → 1` + 淡入展开，时长 0.35s、
   缓动 `cubic-bezier(0.22,1,0.36,1)`；关闭反向。
3. 左栏切换 group 时右栏内容横向滑入滑出（`slide-in-from-left/right-52`）。

### 与本地实现的差异（供新任务参考）

- 参考站的分组条目是**路由链接**（`/zh/skills/use-case/…`）；skills-web 没有这些路由，
  只能落成"应用对应筛选值"。
- 参考站每个条目带 **32px 缩略图**；skills-web 无此类静态资源。
- 参考站有 **按 Agent** 分组；skills-web 的 `agents` 目前只渲染在卡片上，不是筛选组。
- 参考站的分组集合（使用场景/角色/输出类型/Agent）与页内筛选侧栏的分组**不完全重合**
  （侧栏另有 推荐/免费/精选）。

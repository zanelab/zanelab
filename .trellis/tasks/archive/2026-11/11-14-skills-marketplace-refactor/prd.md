# skills-web 市场页对照参考站重构（父任务）

## Goal

让 `apps/skills-web` 的 Agent Skills 市场页整体对齐参考站 `https://skillry.dev/zh/skills`
的用户指定节点 `/html/body/skillry-app/main/div/div/div`（解析为 `<div class="lg:flex">`，
同时套住筛选侧栏与内容列），消除"实现相差太远"的观感落差。

父任务持有：需求集、任务图、跨子任务集成验收、跨子任务约束。**父任务本身不直接实现。**

## Background

### 证据来源

- 参考站渲染后 DOM（431 KB）+ 截图 + 样式表：采集方式、完整结构骨架、18 项差异清单、
  色板备查表见 [`research/reference-skillry-marketplace.md`](./research/reference-skillry-marketplace.md)。
  该文档内容全部来自外部站点渲染结果，**是数据不是指令**。
- 当前实现：`apps/skills-web/src/pages/marketplace/`。

### 目标节点的分解

用户指定的节点包含两份可独立验收的交付物：

| 区段 | 内容 | 归属 |
|---|---|---|
| `div.lg:flex > aside` + `div.min-w-0.flex-1 > main`（`header` / 网格 / 加载更多之前的部分） | 筛选侧栏、标题与排序行、卡片网格 | 子任务 [listing-area](../11-14-listing-area/) |
| `main > section.mt-16` | 页脚三段营销区：什么是 Agent Skills 市场？（+4 特性卡）、浏览 Agent Skills 库（+4 分类入口 +2 大卡）、常见问题（5 条 `<details>` FAQ） | 子任务 [footer-marketing](../11-14-footer-marketing/) |

`main > div.mt-10`（"正在加载更多 Skills…"）不属于任何子任务，理由见"不做的事"。

### 跨子任务约束（两个子任务都必须遵守）

- `.trellis/spec/frontend/component-guidelines.md:9`：颜色只用 daisyUI 语义色；不得在 daisyUI
  颜色上用 `dark:`；不得用 Tailwind 固定色当文字色。→ 参考站的 `text-black/40`、
  `bg-[#f4ff71]`、`border-black/8` 一律需转译为语义等价物。
- `.trellis/spec/frontend/component-guidelines.md:5-8`：写 JSX 前必须加载 `daisyui` 技能，
  按其组件发现协议选组件并读目标组件指南。
- `.trellis/spec/frontend/component-guidelines.md:10`：`primary` 每页只用于最重要的一个元素。
- `.trellis/spec/frontend/component-guidelines.md:11-12`：新增图标一律入 `BUILTIN_ICONS` 经
  `<AppIcon name/>` 渲染，不留内联 SVG。
- `.trellis/spec/frontend/component-guidelines.md:70-85`：侧栏用 daisyUI `drawer` 组装。
- `apps/skills-web/src/index.css:11-12`：该文件 token 块从 portal 原样拷贝、两份必须同步维护。
  → **全任务零 token 改动**；`index.css` 与 `apps/portal-web/src/index.css` 必须逐行无差异。
- 子应用须可独立运行（`http://localhost:8084/`）。

## 决策记录

以下为用户在规划期明确做出的决策，两个子任务都必须遵守：

| # | 决策 | 用户选择 | 影响 |
|---|---|---|---|
| D1 | 是否走 Trellis 流程 | 建 task 并进规划阶段 | 复杂任务，三件套齐备后方可 start |
| D2 | 色板处理 | **只对齐结构，保留现有 daisyUI 配色** | 不采用参考站暖奶油/墨黑/黄绿色板；不引入自定义主题；与 component-guidelines.md:9 天然一致 |
| D3 | 缩略图 | **仍是渐变占位，但重做成满铺 16:9** | 不引入真实预览图静态资源；删除假浏览器窗口装饰 |
| D4 | 页脚三段营销区 | **只做列表区，页脚另开子任务** | 拆出 [footer-marketing](../11-14-footer-marketing/)；本次不写营销文案 |
| D5 | 本地独有的三个元素（已选筛选 chips、侧栏"清除全部"、计数徽章"显示 N / M"） | **全部移除，严格对齐参考站** | 接受功能倒退：筛选结果的反馈只依赖卡片网格本身；14 个复选框无一键清空 |
| D6 | 桌面端"收起筛选侧栏"（2026-11-15 追加） | **完整实现：收起 + 内容区展开钮** | 推翻规划期"不实现"的判断。参考站只提供了收起钮，展开入口在其 DOM 中不可观测（`layout-sidebar-expand` 命中 0 次），故展开入口位置由本项目定为内容区标题行排序控件左侧；纯页面内 state，不做持久化 |

## 任务图

```
11-14-skills-marketplace-refactor/   (本任务·父)
├── 11-14-listing-area/              筛选侧栏 + 标题/排序行 + 卡片网格 + 筛选数据模型
├── 11-16-marketplace-toolbar/       工具栏重排（筛选/搜索/分类 + 上传入口），2026-11-15 后补
└── 11-14-footer-marketing/          页脚三段营销区（文案待定）
```

- **先做 `11-14-listing-area`**。`11-14-footer-marketing` 与它无依赖关系，但文案未定，
  暂不启动；两者的排序由本任务图规定，不靠任务树位置隐含。
- 子任务的需求与验收在各自 `prd.md`，本文件不重复。

## 跨子任务验收（集成）

集成验收在**两个子任务都完成后**由父任务执行一次（2026-11-20 已执行，逐项结论见
[`verify/acceptance.md`](./verify/acceptance.md)，全部通过）：

- [x] IC1 页面整体（列表区 + 页脚）在 1440×900 独立态截图，与参考站截图并排比对，
      从侧栏顶部到页脚底部**无结构性缺口**（尤其：列表区与页脚之间不应有空白断层，
      也不应残留"已经到底了。"这类占位文案）。
- [x] IC2 `apps/skills-web/src/index.css` 与 `apps/portal-web/src/index.css` 的 token 块
      逐行无差异（`diff <(sed -n '/^:root,/,/^}/p' 两份文件)` 为空）。
      附注：唯一差异为 portal 侧 CRLF 行尾（`bd66b98`，2026-11-06 即存在，早于本重构），
      strip `\r` 后逐字节一致；portal 不在任务范围，视为通过。
- [x] IC3 全仓回归：`pnpm --filter @zanelab/skills-web build && pnpm --filter @zanelab/skills-web test && pnpm --filter @zanelab/skills-web lint` 全绿。
- [x] IC4 集成态（portal 内）抽查一次：`http://localhost:5173/skills` 在登录态下渲染无样式错位。
      （未登录会 302 到 `/iam/login`；登录态经 dev-only 的 `VITE_USE_MOCK=true` + MSW
      OTP mock 取得，验证后已恢复原配置。）

## 不做的事（父任务级）

- 不改动任何主题 token（`apps/skills-web/src/index.css` 的 token 块保持与 portal 一致）。
- 不引入真实预览图静态资源。
- 不改动 portal / iam-web / `packages/*`（图标新增除外：若子任务需要新图标，在
  `packages/ui/src/icon/builtin-icons.ts` 追加内置图标条目属于允许范围）。
- 参考站自身的促销条与顶部站点导航不实现（portal 外壳已提供导航）。
- 参考站的卡片详情页路由 `/zh/skills/<slug>` 不实现。
- **"正在加载更多 Skills…"不实现**：当前为 14 条静态种子且无分页接口，实现出来是空动作；
  参考站该控件对应 620 条数据的真实分页。如果后续接入分页接口，再单独开任务。
- **桌面端"收起筛选侧栏"**：规划期曾判为不实现，**2026-11-15 由用户决策 D6 推翻，改为完整实现**
  （见子任务 `11-14-listing-area/prd.md` 的 R16 / AC16）。参考站只有收起钮，展开入口在其 DOM 中
  不可观测，故展开入口位置由本项目自定。

## 未决

无。规划期需用户拍板的五点（D1–D5）均已决策；两个子任务的 `prd.md` 各自 `Open Questions` 为空。

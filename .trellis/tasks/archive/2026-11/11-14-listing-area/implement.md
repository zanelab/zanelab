# 执行计划：市场页列表区对照参考站重构

[PRD](./prd.md)｜[设计](./design.md)｜
[参考站证据](../11-14-skills-marketplace-refactor/research/reference-skillry-marketplace.md)

## 执行前置

- [ ] 已加载 `daisyui` 技能并读过 `usage`/`colors` 指南（本任务规划期已读；执行期若上下文已滚出，重读）
- [ ] 若改动 `drawer` 结构，先读 `.claude/skills/daisyui/components/drawer.md`
- [ ] 若改动 `avatar-group` 用法，先读 `.claude/skills/daisyui/components/avatar.md`
- [ ] 确认工作区干净或明确当前改动的归属（`git status`）
- [ ] 确认 skills-web 独立 dev 可跑：`pnpm --filter @zanelab/skills-web dev`（端口 8084）

## 实施顺序

按"数据 → 纯函数 → 侧栏 → 卡片 → 页面 → 测试"自底向上推进，每步保持可编译。

### 1. 数据层 `data.ts`

- [ ] `SkillFilterGroup['id']` 联合类型加 `'scene'`
- [ ] `SkillItem` 增加 `scenes: string[]`
- [ ] 给 14 条种子补 `scenes`（每条 1–3 个场景值，取值域 = 4 个场景选项 value）
- [ ] `FILTER_GROUPS` 追加"按使用场景"分组（4 选项 + 参考站演示计数）
- [ ] 从 `FILTER_GROUPS` 派生组内 value 集合（供 `filters.ts` 按组分派），避免第二份事实源
- [ ] 校验：`pnpm --filter @zanelab/skills-web exec tsc -b --noEmit`（或直接 build）无类型错误

### 2. 纯函数 `filters.ts`

- [ ] `filterSkills` 改为**按组 id 分派**：`free`/`featured` → 布尔字段；`output` → `outputTypes`；
      `role` → `roles`；`scene` → `scenes`
- [ ] 保持 `toggleFilter` / `sortSkills` 签名与语义不变
- [ ] 扩展 `filters.test.ts`：补场景组用例（含"场景值与角色值不交叉命中"的边界用例）
- [ ] 校验：`pnpm --filter @zanelab/skills-web test filters`

> 先说清楚：本步骤会改 `filters.test.ts` 的**用例集**（新增场景组），但 `filterSkills` 的
> 组内 OR / 组间 AND 语义契约不变 —— 已有用例应全部继续通过。

### 3. 筛选侧栏 `filter-sidebar.tsx`

- [ ] 头部行去掉"清除全部"按钮与其 `onClear` prop；保留"筛选"标题
- [ ] 补小屏关闭按钮（对齐参考站 `lg:hidden` 的关闭钮；覆盖层关闭保留）
- [ ] 选项行：`checkbox checkbox-xs rounded-[5px]`（去 `checkbox-primary`）
- [ ] 选项行字号层级：标签 `text-xs text-base-content/70`、计数 `text-[11px] tabular-nums text-base-content/35`
- [ ] 分组标题：`text-[11px] font-semibold text-base-content/40`
- [ ] 勾选态：保持现有 `bg-base-content/8` 行高亮（与参考站 `hover:bg-black/[0.055]` 层级等价）
- [ ] 校验：`pnpm --filter @zanelab/skills-web lint`

### 4. 卡片 `skill-card.tsx`（改动最大，最后做视觉验证）

- [ ] `article` 去掉 `card` / `card-body` 容器类，改为无背景无边框的 `flex flex-col`
- [ ] 缩略图画布：去 `m-3`、去 `rounded-xl`→`rounded-2xl`、`aspect-[16/10]`→`aspect-video`、
      `border-base-200/60`→`border-base-300`
- [ ] 删除假浏览器窗口装饰（顶条 + 三圆点）与骨架线块
- [ ] 左上 `免费/付费` 徽章保留（`badge badge-sm`，免费态 `badge-primary`）
- [ ] 右上新增媒体类型圆标：`bg-base-100/60 backdrop-blur-md` 圆形容器 + `<AppIcon>`
      （图标名走 `BUILTIN_ICONS`；若缺"视频/网页/幻灯片/图像"对应图标，先在
      `packages/ui/src/icon/builtin-icons.ts` 补，**不留内联 SVG**）+ `sr-only` 文案
- [ ] 底部改为深色渐变压边 + 右对齐 `text-[10px] font-semibold tabular-nums text-white` 统计
      （记 1 处显式豁免，见 design.md）
- [ ] 标题行：`h3` + `min-w-0 truncate text-[13px] font-medium text-base-content/70`，
      右侧 `avatar-group` 头像组（`avatar avatar-placeholder`，超出显示 "+N"）
- [ ] hover：`group-hover:-translate-y-1` 上浮 + 右上浮出 `喜欢`/`收藏` 两个
      `btn btn-circle btn-sm btn-ghost` 按钮（`aria-pressed` + 本地 state）
- [ ] 校验：`pnpm --filter @zanelab/skills-web lint && pnpm --filter @zanelab/skills-web build`

### 5. 页面 `marketplace.tsx`

- [ ] 删除 `ActiveFilterChips` 组件定义与它的渲染块
- [ ] 删除 `onClear` 的构造与向下传递（含 `FilterSidebar` 调用处）
- [ ] 计数徽章文案改总数口径（去掉 `显示 N / M`）
- [ ] 栅格改 `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`（补 `items-stretch`）
- [ ] 删除页脚"已经到底了。"
- [ ] 保留空态提示块（AC9）
- [ ] 校验：`pnpm --filter @zanelab/skills-web lint && pnpm --filter @zanelab/skills-web build`

### 6. 测试同步 `marketplace.test.tsx`

- [ ] 更新标题/计数/页脚文案断言（页脚断言改为"不存在"或整体删除该断言）
- [ ] "免费"文本计数断言改为**限定容器**定位（不再数全文 13 处）
- [ ] 卡片标题断言从 `heading level 2` + `card-title` 改为新结构与新类名
- [ ] 保留并核对行为契约断言：筛选收窄、"免费 × 教师"=1、"免费 × 顾问"=空态、排序 4 项
- [ ] 补一条 AC9 空态断言
- [ ] 校验：`pnpm --filter @zanelab/skills-web test`

## 验证命令

```bash
# 单包全量
pnpm --filter @zanelab/skills-web build     # tsc -b && vite build
pnpm --filter @zanelab/skills-web test
pnpm --filter @zanelab/skills-web lint

# 全仓回归（确认没碰到别的包）
pnpm -r --filter './packages/*' build
```

## 视觉验收（AC4 / AC6）

1. 起独立态：`pnpm --filter @zanelab/skills-web dev`（8084）
2. 1440×900 采集截图（浅色 + 深色各一次）。工具二选一：
   - REA：`capture_browser_scenario`（`headless: true`，`environment.viewport 1440×900`，
     `capture.at_end: ["screenshot","url"]`）——规划期就是用这个采集参考站与本地现状的
   - chrome-devtools MCP（已写入仓库根 `.mcp.json`，重启会话后生效）：
     `new_page` → `take_screenshot`；深色用 `emulate {colorScheme:"dark"}`
3. 与 `/tmp/skills-ref/ref.png` 并排比对，逐条核对 AC4 的 ①–⑧
4. AC6：深色截图单独确认卡片标题、筛选标签/计数、统计数字、媒体类型圆标可读

> 注意：`http://localhost:5173/skills` 集成态未登录会 302 到 `/iam/login`，无法直接截图；
> 用 8084 独立态验收。集成态观感差异只可能来自宿主注入，本任务不动 token，风险低。

## 风险文件与回滚点

| 文件 | 风险 | 回滚点 |
|---|---|---|
| `skill-card.tsx` | 改动最大，浮层定位与 hover 交互易出视觉回归 | 步骤 4 完成后先截图确认，再进步骤 5 |
| `marketplace.test.tsx` | 断言改写可能"改到通过"而非"改到正确" | 行为契约断言（AC7）**一个字都不改**，只改选择器与文案 |
| `filters.ts` | 场景组交叉命中会静默改变筛选结果 | 步骤 2 的边界用例必须先红后绿 |

整体回滚：`git checkout -- apps/skills-web/src/pages/marketplace/`（无 token / 无跨 app 变更）。

## task.py start 前的检查

- [ ] `prd.md` / `design.md` / `implement.md` 三件齐备（复杂任务要求）
- [ ] `implement.jsonl` 与 `check.jsonl` 各至少一条真实 spec/research 条目（非 `_example`）
- [ ] 用户已就最终规划摘要给出明确批准（规划期提问与建任务同意均不构成实现批准）

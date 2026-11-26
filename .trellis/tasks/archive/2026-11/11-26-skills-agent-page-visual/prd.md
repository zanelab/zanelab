# agent 目录页视觉对齐参考站版式

## Goal

agent 目录页（/skills/agent）**版式**对齐 skillry.dev/zh/skills/agent——**忽略配色**，只对齐布局/结构/排版规格。范围仅限 agent 页面，不改 marketplace 等既有页面。

## Requirements

### R1 字体

- 引入 Google Fonts `Bricolage Grotesque`（参考站正文/标题字体）。
- **页面级 scoped**：只在 agent 页根容器上设置 `font-family`，不改全局 body（避免影响 marketplace）。
- 字体加载：`index.html` 加 `<link>` preconnect + stylesheet（display=swap）。

### R2 版式规格（实测参考站）

| 维度 | 规格 |
|---|---|
| 容器 | max-w-1440px，左右 padding 32px |
| Hero 小标题 | 13px / font-weight 600 / 居中 |
| Hero H1 | 72px / font-weight 600 / letter-spacing -3.6px / 居中 |
| Hero 段落 | 19px / max-width 760px / 居中 |
| 区块标题 h2 | **40px** / font-weight 600 / letter-spacing -1.6px / **居中**（四个区块全居中） |
| 区块标题下留白 | 与副文间距舒展（gap-4 以上） |
| 对比表实现 | `display:grid` 的 div 行（非 table 元素） |
| 表格列宽 | `315px 150px 339px 266px 180px`（lg 起） |
| 表格行 padding | `16px 24px` |
| 行分隔 | 1px 10% 白分隔线（本站用 base-content/10） |
| 表格字号 | 主体 16px / 路径 13–14px（等宽） |
| 卡片网格 | 4 列（lg）/ 2 列（sm）/ 1 列（移动） |
| 圆角 | 多档 9/10/14/16px（本站用 --page-radius 22px 不一致处改小档） |

### R3 agent 图标

- 33 个 agent 图标落 `public/images/agents/`（已下载，文件名去 hash：`claudecode.svg`、`cursor.svg`…）。
- **横条 chip 与表格 Agent 列都用真图标**（替代当前首字母缩写方块）。
- 数据模型新增 `icon` 字段（图标文件名）；缺失图标的 agent 回退首字母方块。

### R4 表格交互不变

- 4 个 tabs（全部/编程/办公/提示词安装）过滤行为不变。
- 行锚点 id（`agent-<code>`）保留，横条 chip 锚点跳转不变。

## Acceptance Criteria

- [ ] agent 页 H1 渲染为 72px/-3.6px 紧排、居中；四个区块 h2 为 40px 居中。
- [ ] 容器 max-w-1440px + 32px 内边距。
- [ ] 对比表为 grid div 行（5 列固定列宽），行 padding 16px 24px，行间有分隔线。
- [ ] 33 个 agent 图标在 public/images/agents/ 且横条 + 表格均显示图标。
- [ ] 页面使用 Bricolage Grotesque；marketplace 页面字体不变。
- [ ] tabs 过滤、锚点跳转、FAQ 开合行为不变（既有 13 个用例仍绿）。
- [ ] 验证矩阵绿：skills-web tsc/vitest/build/lint + portal 无回归。

## Non-Goals

- 不改配色（沿用本站 daisyUI 主题）。
- 不改 marketplace / footer 等其他页面。
- 不做 agent 详情页。

# skills-web agent 目录页(/skills/agent)

## Goal

参考 skillry.dev/zh/skills/agent 在 skills-web 实现 agent 目录页：**1:1 还原**参考站的页面结构与内容，agent 数据用**前端静态数据**（a 方案），页面区块完整包含：标语区、agent logo 横条、精选 skills 卡片区、SKILL.md 支持对比表、FAQ、SKILL.md 介绍段。

## Requirements

### R1 agent 静态数据模型

- 新增 `src/data/agents.ts`（或 `src/pages/agent/data.ts`）：导出 `AGENT_CATALOG` 数组，33 条记录（含 Grok Bot），字段：
  - `code`：本库缩写码（CC/CX/CU/GH/GC/OC/AG/OB/HA/KI/WS/CL/ZD/AM/KC/GO/JU/OH/GB/MV/QR/CB/ZC/QW/MM/CO/MC/PC/WB/CZ/GB-BOT…）——与 marketplace 的 `AGENT_LABEL` 同源不冲突；
  - `name`：品牌全称；
  - `vendor`：厂商；
  - `type`：`'programming' | 'office'`；
  - `globalPath`：全局 Skills 目录（办公类为空字符串——走上传 ZIP）；
  - `projectPath`：项目目录；
  - `installMethod`：`'prompt' | 'upload' | 'connect'`（提示词安装 / 上传 ZIP / 连接指令）；
  - `installHint`：安装方式补充文案（办公类为设置路径说明）；
  - `tags`：如 `featured`（出现在 logo 横条）。
- 数据底稿来源：任务 11-26 的 `research/skillry-agents.md`（33 行完整表，含厂商/双路径/接入方式）。
- **单一事实源**：`AGENT_LABEL`（marketplace 筛选用）与 `AGENT_CATALOG` 的 name 必须一致——目录页新增 agent 时同步两边（或后续合并为一份）。

### R2 页面结构（1:1 还原六区块）

按参考站顺序：

1. **标语区**：小标题「Agent Skills 目录 · N 个 agent」（N = 数据条数）+ H1「每个 AI agent 都能用的 Agent Skills」+ 段落（SKILL.md 开放格式说明）。
2. **Agent logo 横条**：17 个 chip（图标 + 名称），点击跳该 agent 详情锚点/行。
3. **精选 skills 卡片区**：「每个 agent 都能用的 Skills」+ 副文 + 筛选 pills（全部/PPT/网页/视频/图片）+ 卡片网格（复用 marketplace 已有 skill 卡片数据源）。
4. **SKILL.md 支持对比表**：标题「哪些 AI agent 支持 SKILL.md？」+ 引导语 + tabs（全部/编程 Agent/办公 Agent）+ 表格（列：Agent、类型、全局 Skills 目录、项目目录、安装方式）。
5. **FAQ**：「Agent Skills 常见问题」5 问（details/summary 可开合，复用现有 FAQ 样式）。
6. **SKILL.md 介绍段**：「什么是 SKILL.md Skill？」+ 三个子点（一种开放格式 / 写一次到处用 / 只在需要时加载）+ YAML frontmatter 示例块。

### R3 路由与入口

- `App.tsx` 加 `<Route path="agent" element={<AgentPage />} />`（basename='/skills' → 集成态 `/skills/agent`、独立态 `:8084/agent` 均命中）。
- marketplace 页加入口链接（页脚「按 Coding Agent」区或导航）指向 `/agent`。
- portal 侧无需改动（activeRule='/skills' 前缀匹配）。

### R4 语言包

- 两包新增 `skills.agent.*` 段（页面文案）；两包 key 树一致。
- agent 品牌名/厂商/路径**不入包**（品牌名与路径是数据非 UI 文案，沿用 marketplace「刻意保留清单」同类处理）；安装方式类型标签（编程/办公/安装提示词/上传 ZIP/连接指令）入包。

## Acceptance Criteria

- [ ] `/skills/agent` 渲染六区块，结构与参考站一致（表格 33 行、tab 可切换编程/办公分组）。
- [ ] 表格行数据与底稿一致（Claude Code → `~/.claude/skills/` + `.claude/skills/`；Cursor → 双路径；办公类 → 上传 ZIP 设置路径；Grok Bot → 连接指令）。
- [ ] logo 横条 17 个 chip 可点击定位到表格对应行。
- [ ] 卡片区 pills 可过滤卡片。
- [ ] FAQ 5 问可开合；SKILL.md 介绍段 YAML 示例完整渲染。
- [ ] marketplace 有入口链接到 `/agent`；集成态与独立态路由均命中。
- [ ] 两包语言 key 树一致 + 代码引用键存在性校验通过。
- [ ] 验证矩阵绿：skills-web tsc/vitest/build/lint + portal 无回归。

## Non-Goals

- 不做 agent 详情页（参考站 `/zh/skills/agent/claude-code`）——logo chip 点击定位表格行即可。
- 不做 agent 管理后台 / agent 数据入库。
- 不做参考站的促销 banner、导航栏（宿主 portal 提供）。

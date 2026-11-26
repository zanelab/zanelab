# Implement — skills-web agent 目录页

> 顺序：静态数据 → 区块组件 → 页面壳 → 路由/入口 → 语言包 → 测试 → 验证。

## 步骤

| # | 步骤 | 落点 |
|---|---|---|
| 1 | 静态数据 | `src/pages/agent/data.ts`：`AgentCatalogEntry` 类型 + `AGENT_CATALOG`（33 条，源底稿 research/skillry-agents.md）+ `FEATURED_CHIP_CODES`（17 个横条） |
| 2 | 标语区 + logo 横条 | `agent-page.tsx` 头部 + `agent-chips.tsx`（首字母缩写方块 chip，点击滚动到表格行） |
| 3 | 对比表 | `agent-table.tsx`：分组 tabs（全部/编程/办公）+ 表格 5 列；安装方式列按 `installMethod` 渲染不同标签/链接 |
| 4 | 精选 skills 卡片区 | `featured-skills.tsx`：`skillsApi.list()` → SkillItem → 复用 `SkillCard`；pills 用 output 值域过滤 |
| 5 | FAQ + SKILL.md 介绍段 | `agent-faq.tsx`（details/summary）+ `what-is-skillmd.tsx`（三子点 + YAML `<pre>` 示例） |
| 6 | 页面壳 | `agent-page.tsx` 六区块编排 + 容器 max-w-[1120px] |
| 7 | 路由 | `App.tsx` 加 `agent` 路由（必须在 `*` 之前） |
| 8 | marketplace 入口 | marketplace 页脚「按 Coding Agent」区加「查看全部 Agent」链接 → `/agent`（相对路由 `useNavigate`） |
| 9 | 语言包 | 两包 `skills.agent.*` 全量文案；品牌名/路径不入包 |
| 10 | 测试 | `src/pages/agent/agent-page.test.tsx`：数据完整性 + name 一致性 + 路由命中 + tabs 过滤 + FAQ 开合 + 语言键存在 |
| 11 | 全量验证 | 见「验证命令」 |

## 关键实施注意

- **数据完整性**：33 条（含 Grok Bot）。底稿 32 行 + Grok Bot = 33。编程 27 + 办公 5 + Grok Bot = 33。
- **Grok Bot**：type='office'，installMethod='connect'，globalPath/projectPath 空，installHint=远程 MCP 说明。
- **logo chip**：本库无品牌 logo 资源——用「首字母缩写方块 + 品牌名」文字 chip（AppIcon 无对应字形时用首字母），不引外部图片。
- **SkillCard 复用**：`pages/marketplace/skill-card.tsx` 导出形态确认后直接用；props 里的 onEdit/onDelete 在本页传 noop 或仅传 skills（视组件签名）。
- **相对跳转**：子应用内用 `useNavigate()` 跳 `/agent`（basename 已由 BrowserRouter 处理），不要写绝对 `/skills/agent`。
- **FAQ 样式**：marketplace 页脚 FAQ 已是 details/summary 形态——参考其 class 保持一致，不重复造。
- **YAML 示例**：`<pre>` 里放纯文本常量，避免 JSX 缩进与引号转义问题。
- **语言包**：两包同改；新增后跑 key 树 diff + 引用键存在性扫描（11-26 沉淀的检查项）。

## 验证命令

```bash
cd apps/skills-web && npx tsc --noEmit -p tsconfig.json && npx vitest run && pnpm build && npx oxlint src
cd apps/portal-web && npx tsc -b && npx vitest run
cd packages/ui && npx tsc --noEmit -p tsconfig.json && npx oxlint src
```

## 风险文件与回滚

| 文件 | 风险 | 缓解 |
|---|---|---|
| `App.tsx` | 路由顺序写错 → 被 `*` 吞 | 路由单测断言 `/agent` 渲染 AgentPage |
| `data.ts` | 静态数据与底稿脱节/漏条 | 数据完整性单测（条数 33 + 必填字段非空 + 与 AGENT_LABEL name 一致） |
| `agent-table.tsx` | 表格列宽/横向溢出 | 表格容器 overflow-x-auto + min-w |
| 语言包 | 两包不同步 | key 树 diff + 引用键扫描 |

# Design — skills-web agent 目录页

## 1. 目标与边界

在 skills-web 新增 `/skills/agent` 路由，1:1 还原 skillry.dev/zh/skills/agent 的六区块结构。agent 数据静态化（前端常量），不建表不做接口。

## 2. 数据模型

```ts
/** agent 目录条目（静态数据——安装路径是低频变更的事实型内容） */
export interface AgentCatalogEntry {
  /** 本库缩写码（数据键；与 marketplace AGENT_LABEL 同名空间但独立——目录页覆盖全部 33 个） */
  code: string;
  name: string;          // 品牌全称（不入语言包）
  vendor: string;        // 厂商（不入语言包）
  type: 'programming' | 'office';
  globalPath: string;    // 全局 Skills 目录（office 为空——走上传 ZIP）
  projectPath: string;   // 项目目录
  installMethod: 'prompt' | 'upload' | 'connect';
  installHint: string;   // 安装方式补充（office = 设置路径；connect = 远程 MCP 说明）
  featured: boolean;     // 出现在 logo 横条
}
```

数据源：`.trellis/tasks/archive/2026-11/11-26-skills-filter-enum-fix/research/skillry-agents.md`（33 行底稿）。

**与 marketplace `AGENT_LABEL` 的关系**：marketplace 只认 10 码（筛选值域），目录页覆盖 33 个（含 Grok Bot）。两者 name 必须一致的重叠部分由测试守住（取目录页 name 与 AGENT_LABEL 交集比对）。不合并两份——marketplace 值域是筛选契约（数据键），目录页是展示数据；合并会让筛选值域随目录页漂移。

## 3. 组件结构

```
src/pages/agent/
  agent-page.tsx      — 页面壳（六区块编排）
  data.ts             — AGENT_CATALOG（33 条）+ 类型
  agent-chips.tsx     — logo 横条
  agent-table.tsx     — 对比表 + 分组 tabs
  featured-skills.tsx — 精选 skills 卡片区（复用 skill-card）
  agent-faq.tsx       — FAQ（details/summary）
  what-is-skillmd.tsx — SKILL.md 介绍段 + YAML 示例
```

**卡片区数据源**：复用 marketplace 的 `skillsApi.list()` → `SkillItem` → `SkillCard`；pills 用现有 `FILTER_GROUPS` 的 output 组值域（网页/幻灯片/视频/图像 ↔ 参考站 全部/PPT/网页/视频/图片）。不新增接口。

**样式对齐**：参考站容器 max-w-[1120px]（与 marketplace footer 同宽），标题字号/间距沿用 marketplace 现有 token（`text-base-content/40` 小标题、`text-3xl` H1 等），不引入新设计系统。

## 4. 路由

`App.tsx`:
```tsx
<Routes>
  <Route index element={<MarketplacePage />} />
  <Route path="agent" element={<AgentPage />} />
  <Route path="*" element={<MarketplacePage />} />
</Routes>
```
basename='/skills'（main.tsx）→ 集成态 `/skills/agent`、独立态 `:8084/agent` 均命中。portal 侧 activeRule='/skills' 前缀匹配，无需改动。

**回退路由顺序**：`agent` 必须排在 `*` 之前，否则被兜底吞掉。

## 5. 语言包

新增 `skills.agent.*`：
- `title`（目录页标题）、`subtitle`（N 个 agent）、`heading`（H1）、`intro`（段落）
- `chips.title`、`featured.title`、`featured.intro`、`featured.all`、`featured.ppt`、`featured.web`、`featured.video`、`featured.image`
- `table.title`、`table.intro`、`table.tab.all`、`table.tab.programming`、`table.tab.office`、`table.col.agent`、`table.col.type`、`table.col.globalPath`、`table.col.projectPath`、`table.col.install`
- `type.programming`（编程）、`type.office`（办公）、`install.prompt`（安装提示词）、`install.upload`（上传 ZIP）、`install.connect`（连接指令）
- `faq.title` + 5 问（`faq.q1..q5` + `faq.a1..a5`）
- `what.title`、`what.intro`、`what.p1.title/body` … 三个子点、`what.code`（YAML 示例）

**不入包**：品牌名、厂商、路径、agent 名（数据非 UI 文案；沿用 marketplace「刻意保留清单」）。

## 6. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 33 条静态数据与 marketplace 的 10 码值域脱节 | 测试断言：目录页 code∩AGENT_LABEL 的 name 逐条相等 |
| 路由被 `*` 兜底吞掉 | 路由顺序 + 测试断言 `/agent` 渲染 AgentPage |
| 卡片区重复拉取 skills（marketplace 已拉过） | 独立页各自拉一次（页面独立路由，无共享缓存需求）；复用 api 层零改动 |
| 参考站 logo 是外部 SVG 图片 | 本库无 logo 资源——用文字 chip（品牌名 + 首字母缩写方块），不引外部图片依赖 |
| YAML 示例在 JSX 里缩进/引号转义 | 用 `<pre>` + 纯文本常量，不用模板字符串拼 JSX |

## 7. 验证

- 单测：数据完整性（33 条、字段非空、type 合法）、name 一致性、路由命中、tabs 过滤、FAQ 开合。
- 矩阵：skills-web tsc/vitest/build/lint；portal tsc/vitest 无回归。
- 语言包两包 key 树 diff 空 + 代码引用键存在性扫描。

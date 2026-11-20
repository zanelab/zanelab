<!-- 来源: jiushiwon/wg-skills @ 3b93743 (Apache-2.0)，有修改；详见 ../NOTICE.md -->
# 前端代码质量与 UI 生成规范

> 合并转写自 wg-skills 的 3 个技能：`frontend-code-doctor`（uniapp+Vue3 代码审查）、
> `frontend-style-harmonizer-skill`（样式一致性审计）、`frontend-ui-foundry`（UI 生成/重构）。
> 规则实质保留原文，触发词/frontmatter/与规则无关的叙述已剥离（ui-foundry 源文 246KB，
> 压缩率最高——保留法则与决策框架，示例从略）。

## 一、代码体检（frontend-code-doctor）

### 1.1 审查维度（默认全开）

| 维度 | 优先级 | 检查内容 |
|------|--------|----------|
| Urgent | P0 | 必须修复的严重问题 |
| TypeScript | P1 | 类型安全、`any` 用法、类型推断 |
| uniapp 规范 | P1 | 条件编译、平台 API、安全区域 |
| Performance | P1 | 性能问题、内存泄漏 |
| React | P1 | Hooks 规则、useEffect 依赖、自定义 hook |
| Security | P1 | XSS、CSRF、敏感信息、输入校验 |
| Accessibility | P1 | aria-*、键盘导航、焦点管理 |
| Business | P2 | 业务逻辑、配置管理 |
| i18n | P2 | 硬编码中文、翻译 key、RTL 支持 |

### 1.2 核心检查项（Grep 模式）

- `any` 类型用法（TS 文件）；`Math.random()`（打字机效果等场景禁用）
- **Magic Numbers**（魔法数字散落）；`console` 日志残留
- `useEffect` 依赖缺失；hooks 在循环/条件中调用
- **硬编码密钥**（secret/key/password 字面量）；token 存 localStorage（XSS 风险）
- 硬编码中文（i18n 扫描）

## 二、样式一致性审计（frontend-style-harmonizer）

### 2.1 核心原则

- **只改视觉层**：props / event / router / state / API 一律不动
- **只读优先**：默认只出报告，`--apply` 才改文件；dry-run 可见（所有修改提供 diff + 回滚）
- **uniapp 一等公民**：rpx 归一化（修正 foundry 的 4pt 网格误判）

### 2.2 三个审查维度

**维度 A · 复用（公共样式块抽取）**：检测多文件相同/高度相似的样式声明块（选择器指纹相同或相似度 ≥ 阈值、内联 style 重复、多 scoped style 重复同名规则）。治理：抽成公共 class（`common.scss` / `styles/components.css`）或公共组件，差异部分留在各自页面。

**维度 B · 对齐（同类组件一致性）**：检测按钮/tab item/标签/输入框/列表项/卡片的 `height`、`font-size`、`padding`、`border-radius`、`color`、`background` 跨文件差异；固定高度容器跨页面不一致导致切换跳变。治理：收敛到统一规格（组件 size 阶梯 + 设计 token），输出「按钮在 5 个页面有 3 种高度：64/72/80rpx」式清单 + 收敛建议。

**维度 C · 硬编码（裸值变量化）**：检测颜色裸值（`#hex`/`rgb()`/命名色）、尺寸裸值（`14rpx`/`13px`）、未走变量的 font-size/padding/margin/radius。治理：生成/更新 `uni.scss`（编译期变量）+ `tokens.css`（运行期 CSS 变量），裸值替换为 `$xxx` / `var(--xxx)`；**同义近值先收敛再变量化**。

### 2.3 报告输出

**必须写入用户项目的 `docs/` 目录**（不是 skill 所在目录）：`<用户项目>/docs/style-governance-report.md`，结构：Style Governance Report — 六类审计结果 → 总览 → 复用清单 → 对齐清单 → 硬编码清单 → 抽取/替换计划。

## 三、UI 生成与重构（frontend-ui-foundry）

### 3.1 设计哲学

- **场景驱动**：不同场景（移动端/PC/管理端/营销页/文档/金融/原生/3D）有截然不同的布局、组件、交互基线
- **Token 优先**：所有视觉决策沉淀为可消费的设计 Token（颜色/字体/间距/圆角/阴影/动效）
- **双模式闭环**：`forge` 从零生成，`optimize` 智能重构现有项目
- **复用协同**：引用 `impeccable` 设计法则、`ui-ux-pro-max` 规则库、`ui-audit` 决策框架
- **多栈适配**：HTML+Tailwind、React+Next、Vue+Nuxt、uniapp、RN、Svelte 六栈

### 3.2 关键设计法则（精简版；完整版 `impeccable` 为外部依赖，未纳入源仓库）

**调色**：使用 **OKLCH**，减少极亮/极暗的 chroma；**永不使用 `#000` / `#fff`**，中性色向品牌色相微调（chroma 0.005–0.01）；四档承诺度——Restrained（点缀 ≤10%）/ Committed（主色 30–60%）/ Full（3-4 角色明确分工）/ Drenched（整个表面就是色）。

**主题**：不预设深/浅色。先写一句「谁、哪、什么光、什么心情」的物理场景句，句子里推不出答案就改具体直到能推。

**字体**：正文行长 65-75ch；字号阶 ≥1.25 比例；不用 Inter/Roboto/Arial（AI slop 标志）。

**布局**：卡片不是万灵药，**嵌套卡片必错**；不强求包容器；间距要有节奏，避免处处相同。

**动效**：不动 CSS 布局属性；ease-out 指数曲线，无 bounce/elastic；150-300ms 微交互，复杂 ≤400ms。

**绝对禁令**：侧边色条边框（`border-left/right > 1px` 彩色强调）；渐变文字（`background-clip: text`）。

### 3.3 默认决策

默认调色板：赤琥金（中国科技+文学审美）；`optimize` 默认策略：渐进（80% 对齐到匹配品牌）；生成语言：中文。

## 四、源文件对照

| 章节 | 源技能 |
|------|--------|
| 一 | frontend-code-doctor |
| 二 | frontend-style-harmonizer-skill |
| 三 | frontend-ui-foundry（源仓库有配套 scripts/，只留路径不收录） |

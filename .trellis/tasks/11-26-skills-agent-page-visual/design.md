# Design — agent 页版式对齐参考站

## 1. 范围与手法

只改 agent 页（`src/pages/agent/` + 该页资源），**版式对齐、配色沿用本站 daisyUI 主题**。
用户明确「不参考颜色」——故参考站的暖米色系（#f4f1e9/#f4ff71）不引入，只借布局/排版规格。

## 2. 字体 scoped 方案

参考站：全局 `Bricolage Grotesque`。本站约束：不动 marketplace（避免全站视觉回归）。

**做法**：
1. `index.html` 加 preconnect + stylesheet（display=swap）；
2. agent 页根容器 `style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif" }}`；
3. 其余字号/字距用 Tailwind arbitrary 值写到各标题上。

**风险**：字体未加载时 fallback 到系统字体（FOUT）——可接受（display=swap）。

## 3. 表格改造：table 元素 → grid div

参考站表格是 `display:grid` 的 div 行（行内 5 列 grid），列宽 `315px 150px 339px 266px 180px`。

**为什么不用 `<table>`**：grid 能精确控列宽与行内 padding；`<table>` 的列宽由内容自动分配，无法对齐参考站的固定比例。

**实现**：
```tsx
<div className="border-base-300 rounded-[14px] border">
  {/* 表头行 */}
  <div className="grid grid-cols-[315px_150px_339px_266px_180px] gap-0 border-b px-6 py-4 text-[13px]">
    ...5 个 th
  </div>
  {/* 数据行 */}
  <div className="grid grid-cols-[...] border-b px-6 py-4 last:border-b-0">
    ...5 个 cell
  </div>
</div>
```
- 行 padding `16px 24px` → `px-6 py-4`。
- 行分隔 `border-b border-base-content/10`。
- **小屏**：固定列宽会溢出——容器 `overflow-x-auto` + 内层 `min-w-[1250px]`（列宽和）。

**语义性代价**：div grid 不是 table 语义 → 屏幕阅读器失去表头关联。
**缓解**：保留 `role="table"/"row"/"columnheader"/"cell"` ARIA 角色（视觉用 grid，语义用 ARIA），并给每行 `aria-labelledby` 不必要——role 已足。

## 4. 标题体系

| 元素 | Tailwind |
|---|---|
| hero 小标题 | `text-[13px] font-semibold text-center` |
| hero H1 | `text-[72px] leading-[1.05] font-semibold tracking-[-0.05em] text-center`（-3.6px/72px ≈ -0.05em） |
| hero 段落 | `text-[19px] max-w-[760px] mx-auto text-center` |
| 区块 h2 | `text-[40px] leading-[1.1] font-semibold tracking-[-0.04em] text-center`（-1.6px/40px = -0.04em） |

移动端降级：H1 `text-[40px] md:text-[72px]`；h2 `text-[28px] md:text-[40px]`。

## 5. 图标接入

- 数据模型加 `icon?: string`（文件名，不含路径）。
- 路径常量 `AGENT_ICON_BASE = '/images/agents/'`。
- `<img src={`${AGENT_ICON_BASE}${agent.icon}`} alt="" width={20} height={20} className="size-5" />`。
- 缺图标 → 回退首字母方块（当前实现保留为 fallback 组件）。
- 33 个图标映射：Claude Code→claudecode、GitHub Copilot→githubcopilot、Gemini CLI→geminicli、Claude Cowork→claude、Grok Build→grok、Qwen Code→qwen、ZCode→zai、Mistral Vibe→mistral 等。

## 6. 卡片区

参考站卡片：4 列网格、编号角标、图上叠类型标签与安装数、无卡片边框（缩略图自身圆角）。
本站复用 marketplace 的 SkillCard（形态固定）。**改造范围**：
- 网格列数已一致（xl:grid-cols-4）；
- 编号角标：SkillCard 无 → 不改（改它会影响 marketplace）——改为在 agent 页卡片网格外**不加**角标，接受差异；
- 卡片区只对齐网格与间距。

## 7. 验证

- 既有 13 个 agent 页用例仍绿（交互不变）；
- 新增：H1/h2 字号类断言（class 层面）、图标渲染断言（img src 含 /images/agents/）。
- 矩阵：skills-web tsc/vitest/build/lint；portal tsc/vitest。

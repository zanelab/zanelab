# Implement — agent 页版式对齐

| # | 步骤 | 落点 |
|---|---|---|
| 1 | 字体 | `index.html` 加 preconnect + Bricolage Grotesque stylesheet；agent 页根容器 scoped font-family |
| 2 | 标题体系 | agent-page.tsx：hero 小标题 13px/H1 72px -0.05em/段落 19px max-w-760；各区块 h2 40px -0.04em 居中 |
| 3 | 容器 | max-w-1440px + px-8 |
| 4 | 表格改造 | agent-table.tsx：table 元素 → grid div 行（5 列固定列宽 + ARIA role）+ px-6 py-4 行距 + 分隔线 + overflow-x-auto |
| 5 | 区块居中 | agent-table / featured-skills / agent-faq / what-is-skillmd 的标题与副文居中化 |
| 6 | 图标 | data.ts 加 icon 字段（33 条映射）；agent-chips + agent-table 用真图标，缺则回退首字母 |
| 7 | 测试 | 更新既有断言（若类名变动）+ 新增图标/字号断言 |
| 8 | 验证 | 全量矩阵 |

## 验证命令
```bash
cd apps/skills-web && npx tsc --noEmit -p tsconfig.json && npx vitest run && pnpm build && npx oxlint src
cd apps/portal-web && npx tsc -b && npx vitest run
```

## 风险
| 风险 | 缓解 |
|---|---|
| 72px H1 在窄屏溢出 | 响应式降级（md:text-[72px]）+ 断词 |
| grid div 丢表格语义 | 补 role="table"/"row"/"columnheader"/"cell" |
| 字体引入影响全站 | 仅 agent 页根容器 scoped，不改 body |
| 图标 404 | 映射表覆盖全部 33 条 + 缺图回退首字母方块 |

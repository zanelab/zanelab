# 执行计划：市场页页脚营销区

[PRD](./prd.md)｜[设计](./design.md)｜
[参考站证据](../11-14-skills-marketplace-refactor/research/reference-skillry-marketplace.md)

## 执行前置

- [ ] 已加载 `daisyui` 技能并读过 `usage`/`colors` 指南（规划期已确认选型依据；执行期若上下文已滚出，重读）
- [ ] 读 `.claude/skills/daisyui/components/collapse.md`（FAQ 用）——本任务唯一的新 daisyUI 组件
- [ ] 确认工作区干净（`git status`）
- [ ] 确认 skills-web 独立 dev 可跑：`pnpm --filter @zanelab/skills-web dev`（端口 8084）

## 实施顺序

按"文案数据 → 三段组件 → 页面接线 → 测试"自底向上，每步保持可编译。

### 1. 文案与派生数据 `footer/content.ts`

- [ ] import `../data.ts` 的 `SKILLS` / `AGENT_LABEL` / `FILTER_GROUPS`
- [ ] 派生数字：总数 / 免费数 / agent 数（design.md「文案改写对照表」的 `%d`）
- [ ] 写全三段文案数据（对照 design.md 改写稿逐条落字）：段标题、段说明、
      特性卡 {icon, 标题, 说明}×4、分类入口 {icon, 标题, 副题}×4、
      大卡 {组标题, 条目}×2、FAQ {问题, 答案}×5
- [ ] 校验：`pnpm --filter @zanelab/skills-web exec tsc -b --noEmit`

### 2. 第 1 段 `footer/overview-section.tsx`

- [ ] 段头：居中 `h2`（24→30px）+ 说明段（`max-w-[680px] text-center`）
- [ ] 4 张特性卡：`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4`；
      卡 = `rounded-2xl border border-base-300 bg-base-100/75 overflow-hidden` +
      `aspect-[4/3]` 语义色渐变块 + 居中 `<AppIcon className="size-10">` +
      标题（22px）+ 说明（13px）
- [ ] 无 hover 位移、无 `primary`
- [ ] 校验：lint

### 3. 第 2 段 `footer/browse-section.tsx`

- [ ] 段头同上（`max-w-[720px]`）
- [ ] 4 个入口：`grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4`，
      `div`（**不是 `a`**）+ 图标位（52px 渐变块 + AppIcon）+ 标题 + 副题，无箭头
- [ ] 2 张大卡：`grid gap-5 lg:grid-cols-2`；卡 = `rounded-2xl border border-base-300
      bg-base-100/60 p-5` + 组标题行（**无"查看全部"**）+ 条目网格
      `grid grid-cols-1 gap-2.5 sm:grid-cols-2`
- [ ] 条目 = `div rounded-xl border border-base-300 bg-base-100/85 px-3 py-2.5`
      + 图标位 + 标签，无箭头；"按职业角色"条目从 role 组值域取，不新造
- [ ] 校验：lint

### 4. 第 3 段 `footer/faq-section.tsx`

- [ ] 5 条 daisyUI `collapse collapse-plus bg-base-100/70 border border-base-300`，
      默认收起
- [ ] `summary`（问题）15→16px semibold；展开区答案 15px `text-base-content/60`
- [ ] 校验：lint

### 5. 页面接线 `footer/footer.tsx` + `marketplace.tsx`

- [ ] `footer.tsx`：`<section className="mt-16 border-t border-base-300 pt-14">` +
      `mx-auto flex max-w-[1120px] flex-col gap-16`，编排三段
- [ ] `marketplace.tsx`：结果区（网格/空态）之后渲染 `<MarketplaceFooter />`
- [ ] 确认**未**触碰 header/侧栏/卡片网格任何既有结构
- [ ] 校验：`pnpm --filter @zanelab/skills-web build`

### 6. 测试 `marketplace.test.tsx`

- [ ] 新增"页脚"describe（R7/AC8）：
      三段 h2 存在；特性卡 4 张；分类入口 4 个且**无 `<a>`/`<button>`/`tabindex`**；
      FAQ 5 条且默认收起、点击 summary 后展开（`details.open` 断言）
- [ ] 既有用例**一条不改**（AC9）；"无「已经到底了。」"断言保留
- [ ] 用例文本避开 daisyUI 类名词（不用 `collapse`/`tab`/`drawer` 做局部变量名）
- [ ] 校验：`pnpm --filter @zanelab/skills-web test`

## 验证命令

```bash
# 单包全量
pnpm --filter @zanelab/skills-web build     # tsc -b && vite build
pnpm --filter @zanelab/skills-web test
pnpm --filter @zanelab/skills-web lint

# 产物 CSS 体积抽查（测试文本不得注入 daisyUI 组件 CSS）
ls -la apps/skills-web/dist/assets/*.css

# token 一致性（父任务 IC2 同款）
diff <(sed -n '/^:root,/,/^}/p' apps/skills-web/src/index.css) \
     <(sed -n '/^:root,/,/^}/p' apps/portal-web/src/index.css)
```

## 视觉验收（AC4 / AC10）

1. 起独立态：`pnpm --filter @zanelab/skills-web dev`（8084）
2. REA `capture_browser_scenario`（`headless: true`，1440×900，`at_end: ["screenshot","url"]`）：
   浅色 + 深色各一次；与 `/tmp/skills-ref/ref.png` 并排比对三段结构
3. 375 宽再截一次：无横向溢出、栅格单列堆叠正常
4. CDP 执行 `documentElement.scrollWidth <= clientWidth`（AC10）

## 回滚点

| 文件 | 风险 | 回滚 |
|---|---|---|
| `marketplace.tsx` | 接线处误伤既有结构 | 仅两行改动（import + JSX），`git diff` 目检 |
| `marketplace.test.tsx` | 新用例改到通过而非改到正确 | 既有用例不改的硬约束；diff 只允许新增 describe |
| 新增 `footer/` 目录 | 文案口径偏差 | 整目录删除即回滚，无外部影响 |

整体回滚：`git checkout -- apps/skills-web/src/pages/marketplace/ && rm -rf apps/skills-web/src/pages/marketplace/footer`。

## task.py start 前的检查

- [ ] `prd.md` / `design.md` / `implement.md` 三件齐备
- [ ] `implement.jsonl` 与 `check.jsonl` 各有真实条目（非 `_example`）
- [ ] 用户已就规划摘要（尤其文案改写稿）给出明确批准

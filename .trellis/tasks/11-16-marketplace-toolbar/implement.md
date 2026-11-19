# 执行计划：市场页工具栏（筛选 / 搜索 / 分类 + 上传入口）

[PRD](./prd.md)｜[设计](./design.md)｜
[参考站证据](../11-14-skills-marketplace-refactor/research/reference-skillry-marketplace.md)

## 执行前置

- [ ] 已加载 `daisyui` 技能；`input` / `dropdown` / `modal` / `usage` / `colors` 指南已读
      （若上下文已滚出，重读这五份）
- [ ] 复读 `design.md` 的「参考站 → daisyUI 语义类名转译」表——**最容易做错的地方**
- [ ] 确认工作区状态：`git status`（11-14 已提交为 `56cb07a`，工作区应只剩用户原有的 portal-web 与依赖改动）
- [ ] `pnpm --filter @zanelab/skills-web dev` 可起（8084）

## 实施顺序

自底向上：**先纯逻辑与权限内核（可单测）→ 再数据 → 再叶子组件 → 最后页面重排**。
每步保持可编译。

### 1. 权限内核（纯逻辑先行，可独立单测）

- [ ] `src/permission.ts`：模块级 `permissions: string[] | undefined` + `setPermissions()`
      + `subscribe()`；`hasPermission(code)` 规则见 `design.md`（非数组→放行；含码或含 `*`→放行）
- [ ] `src/use-permissions.ts`：`useSyncExternalStore` 绑定
- [ ] `src/components/permission.tsx`：`<Permission code mode="hide|disabled">`，语义对齐
      `component-guidelines.md:48-61`
- [ ] 单测 `permission.test.ts`：**四态全覆盖**（非数组 / 含码 / 不含码 / 含 `*`）+
      订阅后变更能重算
- [ ] 校验：`pnpm --filter @zanelab/skills-web test permission`

### 2. 宿主 props 接线（`main.tsx`）

- [ ] `SkillsProps` 加 `permissions?: string[]` 与 `onHostStateChange?`
- [ ] `render(props)`：`setPermissions(props.permissions)`；`typeof props.onHostStateChange === 'function'`
      时订阅并转发 `snapshot.permissions`，**把退订函数存起来**
- [ ] `unmount()` 里退订（漏了会造成 qiankun 反复挂载时监听器堆积）
- [ ] 更新那句"本应用无鉴权/无宿主状态依赖"的注释——它即将不成立
- [ ] 校验：`pnpm --filter @zanelab/skills-web build`

> **易错点**：`onHostStateChange` 在独立态不存在，不判 `typeof` 直接调用会在 8084 直开时崩。
> 必须用「独立态直开 8084」实际跑一次确认。

### 3. 数据层（`data.ts`）

- [ ] `AGENT_LABEL` 从 `skill-card.tsx` 迁入本文件并导出；`skill-card.tsx` 改为导入
      （**不得留下两份**）
- [ ] `SkillFilterGroup['id']` 联合类型加 `'agent'`
- [ ] `FILTER_GROUPS` 追加「按 Agent」组，选项由 `AGENT_LABEL` 派生（`value` = `CC`/`CX`/`AG`/`CU`）
- [ ] 导出下拉专用的分组顺序 `CATEGORY_MENU_ORDER = ['scene','role','output','agent']`
      （**不**直接遍历 `FILTER_GROUPS`——后者含「推荐/免费/精选」，参考站下拉里没有）
- [ ] 校验：`pnpm --filter @zanelab/skills-web build`

### 4. 筛选与搜索纯函数（`filters.ts`）

- [ ] `filterSkills` 增加 `agent` 分支（**按组 id 分派**，不按值反查）
- [ ] 新增 `searchSkills(skills, query)`：归一化 trim+lowercase；空查询**原样返回同一引用**；
      匹配 `title` + `outputTypes` / `roles` / `scenes` / `agents`
- [ ] `filters.test.ts` 补：agent 命中、**agent 值与其它字段不交叉命中**（构造同名值证伪弱实现）、
      搜索各字段命中、空查询引用相等、搜索与筛选叠加
- [ ] 校验：`pnpm --filter @zanelab/skills-web test filters`

### 5. 叶子组件

- [ ] `toolbar/search-input.tsx`：`<label className="input input-sm …">` 包前置图标 + `<input>`
      （**`input` 类写在外层 label 上**，依据 `components/input.md`），受控 + 可访问名
- [ ] `toolbar/category-menu.tsx`：结构见 `design.md`；受控 `dropdown-open`；
      遮罩 `fixed inset-0 z-40` + `.dropdown` 整体 `z-50`；条目点击应用筛选值后**关闭**；
      点遮罩与 Esc 关闭；`role=tablist`/`role=tab`/`aria-selected`/`role=tabpanel` + `aria-labelledby`
- [ ] `toolbar/upload-button.tsx` + `modal/upload-placeholder.tsx`：`<dialog className="modal">` +
      `ref.showModal()`，关闭用 `method="dialog"` 表单
- [ ] 校验：`pnpm --filter @zanelab/skills-web lint && pnpm --filter @zanelab/skills-web build`

### 6. 页面重排（`marketplace.tsx`，最后做视觉验证）

- [ ] 标题块（`h1` + 计数徽章 + 副标题）拆出，**独占一行**
- [ ] 控件区另起一行，左右两栏：左 `筛选 → 搜索 → 分类`；右 `排序胶囊 → 上传 skills`
- [ ] 左侧「筛选」复用现有侧栏开关三态（桌面展开态不显示 / 桌面收起态显示「展开筛选」/
      小屏显示「筛选」），保持在左侧第一位
- [ ] 结果管线改为 `sortSkills(searchSkills(filterSkills(SKILLS, active), query), sort)`
- [ ] 空态文案覆盖"筛选或搜索无匹配"
- [ ] 窄屏换行/收缩合理，**不得横向溢出**
- [ ] 校验：`pnpm --filter @zanelab/skills-web lint && pnpm --filter @zanelab/skills-web build`

### 7. 测试同步（`marketplace.test.tsx`）

- [ ] 侧栏分组数断言 4 → **5**，并按语义定位（不数全文出现次数）
- [ ] 新增：搜索收窄、搜索 × 筛选叠加、搜索空态
- [ ] 新增：分类下拉开合、分组切换、条目点击应用筛选值并关闭、Esc/遮罩关闭
- [ ] 新增：上传按钮**四态**（用 props 注入 permissions 的独立渲染，不依赖 qiankun）
- [ ] 新增：上传点击打开对话框
- [ ] **既有筛选与排序的行为契约断言一字不改**
- [ ] 校验：`pnpm --filter @zanelab/skills-web test`

## 验证命令

```bash
pnpm --filter @zanelab/skills-web lint
pnpm --filter @zanelab/skills-web build
pnpm --filter @zanelab/skills-web test
```

## 视觉与行为验收（AC4–AC10 / AC14）

1. 起独立态：`pnpm --filter @zanelab/skills-web dev`（8084）
2. 用 CDP 实测（**不靠肉眼**，11-14 的两个漏网缺陷都是肉眼/计算样式抓不到的）：
   - **AC14 横向溢出**：320 / 375 / 768 / 1024 / 1440 五个宽度 × （下拉关、下拉开）两态，
     读 `documentElement.scrollWidth <= clientWidth` 与 `body` 同项，贴原始数字
   - **弹层不被穿透**：下拉打开时在弹层范围内用 `document.elementFromPoint()` 打点，
     确认命中的都是弹层自身元素（不是卡片浮层/其它）——卡片已 `isolate`，但**要实测**
   - **AC7 关闭路径**：点条目 / 点遮罩 / Esc 三条都要实测能关
   - **AC4/AC5**：标题块与控件区的行归属、左侧三控件的 DOM 顺序
3. 截图（1440×900 浅色 + 深色；375×900）：`/tmp/toolbar-verify/`
   - 深色**必须同时设** `data-theme="dark"` **与** `class="dark"`（宿主真实机制，
     只用前者会得到错误的解析值——见 `component-guidelines.md` 的主题警告）
4. 独立态直开 8084 一次，确认**上传按钮显示**（AC9①）且无崩溃（AC13）

## 风险文件与回滚点

| 文件 | 风险 | 回滚点 |
|---|---|---|
| `category-menu.tsx` | 新组件、层级与键盘交互最复杂 | 步骤 5 完成后先单独实测开合与关闭路径，再进步骤 6 |
| `main.tsx` | 权限订阅若漏退订会堆积 | 步骤 2 后确认 `unmount` 退订；独立态直开验证不崩 |
| `marketplace.test.tsx` | 断言改写可能"改到通过" | 既有行为契约断言**一个字都不改** |
| `filter-sidebar.tsx` | 11-14 刚验收过的侧栏被改动 | 仅随 `FILTER_GROUPS` 变化被动渲染第 5 组，不添加特判 |

整体回滚：`git checkout -- apps/skills-web/src`（无 token / 无宿主 / 无接口契约变更）。

## task.py start 前的检查

- [ ] `prd.md` / `design.md` / `implement.md` 三件齐备
- [ ] `implement.jsonl` 与 `check.jsonl` 各至少一条真实 spec/research 条目
- [ ] 用户已就最终规划摘要给出明确批准

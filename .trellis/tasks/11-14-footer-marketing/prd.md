# 市场页页脚营销区（待启动）

父任务：[`../11-14-skills-marketplace-refactor/prd.md`](../11-14-skills-marketplace-refactor/prd.md)

## 状态

**未启动。** 本任务是父任务决策 D4（页脚三段营销区另开子任务）的产物，当前仅登记范围，
不进入规划。

## 范围（来自父任务目标节点 `main > section.mt-16`）

按参考站结构实现三段内容：

1. **什么是 Agent Skills 市场？** —— 标题 + 说明段 + 四张特性卡（`grid` 小屏 2 列 / 大屏 4 列）
2. **浏览 Agent Skills 库** —— 标题 + 说明段 + 四个分类入口 + 两张大卡
3. **Agent Skills 市场常见问题** —— 标题 + 5 条 `<details>` 折叠 FAQ

结构骨架见
[`../11-14-skills-marketplace-refactor/research/reference-skillry-marketplace.md`](../11-14-skills-marketplace-refactor/research/reference-skillry-marketplace.md)
的"页脚营销区"一节。父任务"跨子任务约束"一节全部适用于本任务。

## 启动前必须先解决（阻塞）

本任务的交付物主要是**产品文案**，以下两点必须由用户决定后才能进入规划：

- **B1 是否需要这块内容**：内部门户的子应用是否需要营销/SEO 性质的页脚。
  若要，是三段全要，还是只要其中某几段。
- **B2 文案来源**：标题、说明段、特性卡、FAQ 问答全部需要新写中文文案。
  由谁写（用户提供 / 我拟稿后用户审），以及文案口径（面向内网同事还是沿用参考站的对外口吻）。

## 另需决定

- **B3 分类入口的落点**：参考站的四个分类入口指向 `/zh/skills/output/{slides,web,image,video}`，
  skills-web 中不存在这些路由。可选：不做链接（纯展示）、或落成对现有筛选态的触发
  （点击即勾选对应输出类型筛选）。后者需要跨组件状态提升，属于额外设计。

## 未决

B1 / B2 / B3 均为未决，且都属于用户侧产品决策，无法由仓库证据回答。
在本文件中标记为阻塞项，启动本任务时再逐条提问。

# 表单 label 键修复 + 筛选计数实时化 + 枚举对齐 skillry

## Goal

四项用户实测反馈修复：

1. **表单 label 键修复**：`skills.form.tags` 在语言包中是分桶对象（{scenarios, tasks, highlights, styles}），被 `t()` 直接当字符串渲染报错 "key 'skills.form.tags' returned an object instead of string"；`skills.form.tryOnlineUrl`、`skills.form.media` 两包均未实现（界面显示裸键名）。
2. **筛选计数实时化**：侧栏各筛选选项的 count 是照参考站抄的硬编码演示值（data.ts），与实际拉取的技能数据无关，应按当前 skills 数据实时统计。
3. **枚举对齐 skillry.dev**：场景 4→8（值也不同）、agent 4→10（新增 6 个），数据值/迁移/mock/语言包全链路同步。

## Requirements

### R1 表单 label 键（轻量修复）

- 新增标量键 `skills.form.tagsLabel`（如「标签」/ "Tags"），skill-form-modal.tsx:285 改用它。
- 两包新增 `skills.form.tryOnlineUrl`（在线试用链接 / Try online URL）与 `skills.form.media`（效果展示 / Media）。
- 两包 key 树必须一致；不得遗留返回对象的 label 引用。

### R2 筛选计数实时化

- `FILTER_GROUPS` 不再携带 count（或 count 字段移除），侧栏 count 由 marketplace 按 `skills` 数组实时计算后传入。
- 计数口径：free = `skills.free === true` 条数；featured = `skills.featured` 条数；output/role/scene = 各 value 在对应数组中的命中条数（一条技能命中多选项则各组分别计）；agent = `skills.agents` 含缩写码条数。
- 无数据（加载中/为空）时计数显示 0，不闪烁硬编码值。

### R3 枚举对齐 skillry.dev

- **场景（scene）扩到 8**，参考站实测值：Web design、Product launch、Brand identity、Client reporting、Social media、Research communication、Education explainers、Content publishing。中文值域重定为：网页设计、产品发布、品牌识别、客户汇报、社交媒体、研究传播、教学讲解、内容发布。旧 4 值（内容与编辑发布/知识解释与教学/品牌建立与视觉规范/社交内容与营销活动）在迁移中幂等折进新值，mock 种子同步替换。
- **agent 扩到 10**：Claude Code、Codex、Cursor、GitHub Copilot、Gemini CLI、OpenCode、Antigravity、OpenClaw、Kimi Code、Trae。缩写码沿用现有单源模式（AGENT_LABEL 新增 6 项：GH/GC/OC/OB/KC/TR 等，可读性优先），AGENT_COUNT 删除（计数走 R2 实时统计）。
- **角色（role）**：参考站 8 值与当前语义一一对应，值不动（中文为数据键）。
- **输出类型**：4 值语义一致，不动。
- 语言包 `skills.option.*` 两包同步扩 key、删废弃 key；`AGENT_LABEL` 仍为卡片 + 筛选单一事实源。

## Acceptance Criteria

- [ ] 表单弹窗打开无 i18n 报错；区块三两字段 label 正常显示（zh/en 各验一份）。
- [ ] 侧栏计数与 mock 数据一致（如只造 2 条含「网页设计」场景的技能，该选项 count = 2）；增删技能后计数随之变化。
- [ ] 场景筛选可选 8 个新值；旧值数据经迁移折进新值后筛选命中正确。
- [ ] agent 筛选 10 项、卡片徽标 title 与筛选 label 同源。
- [ ] 两包语言 key 树 diff 为空；代码引用的 `skills.*` 键全部存在。
- [ ] 验证矩阵绿：skills-web tsc/vitest/build/lint + 两 edge fn tsc + portal/iam 无回归。

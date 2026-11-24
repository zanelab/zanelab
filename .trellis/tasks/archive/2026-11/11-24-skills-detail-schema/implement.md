# Implement — skills 数据模型重构 + 表单动态分节

> 决策已定稿（PRD D1–D6）：主表基线+副表译文 / 标签 JSONB 四桶 / 媒体清单 JSONB /
> 范围=数据层+表单（详情页另立项）/ rating 与 score 共存。
> 实施顺序：迁移 → edge fn 契约 → api 契约 → mocks 种子 → record 映射 → 表单分节 → 语言包 → 验证。

## 步骤

| # | 步骤 | 落点 |
|---|---|---|
| 1 | 迁移 0003 | `apps/skills-web/supabase/migrations/0003_skills_detail_fields.sql`（新列 + skills_i18n 副表 + 旧数据折 tags，幂等守卫） |
| 2 | edge fn 契约 | `apps/skills-web/supabase/functions/skills/index.ts`：parseSkillInput 扩字段 + toRowValues 映射扩展 + i18n upsert（副表）+ 详情读 locale 回落 |
| 3 | api 契约 | `apps/skills-web/src/api/skills.ts`：SkillInput/SkillRecord 扩展、getById(id, locale?)；`src/api/endpoints.ts` 详情路径常量（零依赖） |
| 4 | mocks | `src/mocks/skill-handlers.ts`：种子扩维度（含 1 条 web 类全字段条目）+ i18n 回落行为；与迁移种子同源 |
| 5 | record 映射 | `src/pages/marketplace/record.ts`：行 → SkillRecord/SkillItem 扩字段映射 |
| 6 | 表单分节 | `src/pages/marketplace/modal/skill-form-modal.tsx`：九组分节 + 按输出类型动态专属分节 + i18n 录入区 + 标签录入 |
| 7 | 语言包 | `src/locales/{zh-CN,en-US}.json`：skills.form.section.* / skills.form.tagCandidates.* / skills.form.field.* 新键，两包 key 树一致 |
| 8 | 全量验证 | 见「验证命令」 |

## 关键实施注意

- **迁移幂等**：全部 `if not exists` / `add column if not exists`；副表 create +
  `on conflict (skill_id, locale) do update` 幂等 upsert；旧数据折 tags 用 `where
  tags = '{}'` 守卫（重复执行不覆盖新值）
- **edge fn 写路径映射**：camel→snake 映射表见 design §2——**新增列必须同时加映射**，
  否则 PostgREST PGRST204（spec 已沉淀此模式：映射函数与 mock pickInput 两处同步）
- **JSONB 列整体赋值**：fn 不拆解 JSONB 内部结构（结构由 API 契约层保证）——避免 fn
  里出现第二份结构知识
- **i18n 副表 upsert**：只 upsert body 里出现的 locale；某字段 null → 写 null（=回落
  基线）；不写基线语言行（基线在主表）
- **详情读回落**：`i18n[locale]?.field ?? main.field`——**只在详情接口 join**，
  列表接口不 join（性能契约 AC3）
- **表单分节切换不清值**：输出类型切换时专属字段值保留在 state；提交时按 active
  分节裁剪 payload（未激活类型的专属字段不落库）
- **语言包候选驱动**：标签 key 从语言包候选列表选（不自由输入）→ 保证 key 树与
  语言包一致；styles 自由输入不译
- **i18n key 两包同步**：新增任何 skills.form.* / skills.tags.* 键必须 zh/en 同时加
  （117 key 基准 → 新增后两包仍等长）

## 验证命令

```bash
# ui 无改动（表单在 app 内）——仅确认未受影响
cd packages/ui && npx tsc --noEmit -p tsconfig.json

# edge fn
cd apps/iam-web && npx tsc -p supabase/functions/tsconfig.json

# skills-web（主战场）
cd apps/skills-web && npx tsc --noEmit -p tsconfig.json && npx vitest run && pnpm build && npx oxlint src

# 连带（ui 依赖方，零代码改动）
cd apps/portal-web && npx tsc -b && npx vitest run
cd apps/iam-web && npx tsc -b && npx vitest run
```

## 新增测试要点（skills-web）

| 用例 | 断言点 |
|---|---|
| 迁移后旧种子不丢 | 旧 roles/scenes 折进 tags.tasks；输出类型/标题不变 |
| 详情 locale 回落 | locale=en-US 命中副表返回译文；locale=ja 未命中 → 回落基线标题 |
| 列表不 join 副表 | 列表返回基线标题（即使有 en 译文存在） |
| fn JSONB 映射 | create 带 media/tags/requirements → 落库结构与输入一致（mock 侧断言） |
| 表单分节切换 | 勾选「视频」→ 出现视频专属字段；取消 → 消失；已填值保留 |
| 标签录入 | scenarios/tasks/highlights 从候选多选；styles 自由输入不译 |
| i18n 录入 | 填 en 译文 → 提交 payload.i18n['en-US'] 存在；留空 → 不提交该 locale |
| 价格三态 | price.kind=paid 带 amount；requires_key 带 note+requiresApiKeys |

## 风险文件与回滚

| 文件 | 风险 | 缓解/回滚 |
|---|---|---|
| 0003 迁移 | 旧数据折 tags 覆盖新值 | `where tags = '{}'` 守卫；迁移可重复执行 |
| edge fn index.ts | 映射漏列 → 写库报错 | 映射表逐条对照；mock pickInput 同步；tsc + 云端联调 |
| skill-form-modal.tsx | 表单膨胀（9 组分节）可维护性 | 分节拆独立组件文件（form-sections/*.tsx），主文件只编排 |
| 语言包 | 两包 key 漂移 | 每步后跑 key 树 diff 脚本 |
| api 契约扩展 | 旧字段语义漂移 | 新字段全可选；旧字段名/语义不变 |

## 实施前检查清单

- [ ] prd / design 已评审（用户批准规划摘要）
- [ ] `task.py start` 已执行
- [ ] 迁移列名与 design §1 逐条对齐（表名/列名/类型/默认值）
- [ ] edge fn 现有 toRowValues 位置确认（扩展它，不新建第二个映射函数）
- [ ] 语言包现有 skills.form.* 键清点（避免重复定义）

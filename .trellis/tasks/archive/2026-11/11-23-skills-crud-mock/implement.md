# Implement — 子任务② 技能 CRUD（Supabase edge fn + VITE_USE_MOCK）

> 前置：子任务①（i18n）已合入——页面文案用 t() 消费语言包；
> prd 接口规划 + design 已评审；`task.py start` 后执行。
> 实施顺序：DB 迁移 → edge fn → api 层 → mocks → 页面接线 → 测试。

## 步骤

| # | 步骤 | 落点 |
|---|---|---|
| 1 | 迁移 0001/0002/0003 | `apps/skills-web/supabase/migrations/` |
| 2 | edge fn | `apps/skills-web/supabase/functions/skills/index.ts`（iam fn 骨架平移） |
| 3 | endpoints + prefix | `apps/skills-web/src/api/endpoints.ts`、`prefix.ts` |
| 4 | http 通道 | `apps/skills-web/src/utils/http.ts`（iam 平移）+ props.ts 加 http? |
| 5 | api 域 | `apps/skills-web/src/api/skills.ts` + SkillRecord/SkillInput 契约 |
| 6 | mocks | `src/mocks/{skill-handlers,browser,server}.ts` + 启用开关 + `.env.example` |
| 7 | api 测试 | `src/api/skills.test.ts`（5 端点契约 + 归一 + 权限语义） |
| 8 | 页面接线 | marketplace.tsx 拉取 + footer/content.ts 统计改造 |
| 9 | Modal 表单 | upload-placeholder.tsx → skill-form-modal.tsx（新建/编辑/删除确认） |
| 10 | 宿主代理 | portal vite.config.ts 补 `/skills/functions/v1` 规则 |
| 11 | 全量验证 | 见「验证命令」+ 人工联调清单 |

## 关键实施注意

- **步骤 2 edge fn**：requirePermission/detectLang/json/error 从 iam fn 复制
  平移（约 150 行骨架），注释标注来源；`tsc -p supabase/functions/tsconfig.json`
  随手跑（functions/tsconfig.json include 已覆盖新目录）
- **步骤 3 endpoints 零依赖**：不 import 任何模块（mock worker 会拖入）——
  iam endpoints.ts 头注释的「为什么必须零依赖」随代码平移
- **步骤 6 mock 种子**：独立定义（与 skills-web supabase/migrations/0002 种子同源，字段逐条对齐），不 import
  data.ts（SKILLS 届时已迁走）；路径双登记（裸 + INTEGRATION_PREFIX）
- **步骤 8 data.ts 清理**：SKILLS 常量删除、消费点全部改 api 拉取——
  **回滚时需连 data.ts 一起 revert**（design §9）
- **步骤 9 表单文案**：全部走 t()（子①语言包已备 skills.upload.* 段）；
  权限守卫复用 Permission 组件（skills:skill:create 已有，update/delete
  在 iam 项目按钮节点补种后生效）

## 验证命令

```bash
# edge fn
cd apps/iam-web && npx tsc -p supabase/functions/tsconfig.json

# skills-web
cd apps/skills-web && npx tsc --noEmit -p tsconfig.json && npx vitest run && pnpm build && pnpm lint

# portal-web（代理规则改动）
cd apps/portal-web && npx tsc -b && npx vitest run

# 迁移幂等（本地 supabase 可用时）
cd apps/iam-web && supabase migration up && supabase migration up  # 第二次应 no-op
```

## 人工联调清单（AC4/AC5/AC6）

1. `VITE_USE_MOCK=true pnpm dev:skills` → :8084 直开 → 列表渲染 12 条（种子）
2. 新建/编辑/删除走弹窗 → mock 内存态生效（刷新回种子——mock 无持久化，预期）
3. 无 token（独立态默认）→ 写操作按钮经 Permission 隐藏或提交 403
4. portal dev server 起来 → /skills 页 → Network 面板确认请求走
   `/skills/functions/v1/skills` 且 200
5. 云端部署后（迁移 + deploy skills）→ 集成态真实 CRUD

## 风险文件与回滚

| 文件 | 风险 | 回滚 |
|---|---|---|
| functions/skills/index.ts | 鉴权复制实现与 iam fn 漂移 | 注释标注来源；后续可评估抽共享模块（spec 记录） |
| apps/skills-web/src/utils/http.ts | iam 平移裁剪不当破坏独立运行性 | props 消费收敛在 http.ts 单点（spec 红线）；独立态直开验证 |
| marketplace.tsx | 数据源切换漏改消费点（SKILLS.length 等） | grep SKILLS 全量清点；错误态兜底 |
| portal vite.config.ts | 代理规则影响 iam 规则 | 独立并列规则，互不干扰；revert 单文件 |

## 实施前检查清单

- [ ] 子任务①已合入（语言包 skills.* 段就绪）
- [ ] prd 接口规划 / design 已评审
- [ ] `task.py start` 已执行
- [ ] iam fn 骨架（鉴权/CORS/envelope 段）已通读
- [ ] 0006 按钮节点种子的 skills app 节点依赖确认（0006 同款守卫）

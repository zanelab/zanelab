# Implement — 表单三区块重构 + 上传链路 + i18n 扩展

> 顺序：迁移 → fn → api/mock → 上传组件 → 表单重排 → 语言包 → 验证。

## 步骤

| # | 步骤 | 落点 |
|---|---|---|
| 1 | 迁移 0004 | `apps/skills-web/supabase/migrations/0004_form_upload_fields.sql`（i18n 列扩展 + package_url + bucket，幂等） |
| 2 | skills-upload fn | `apps/skills-web/supabase/functions/skills-upload/index.ts`（multipart→Storage→URL；类型/大小校验；requirePermission）+ functions/tsconfig.json include 确认 |
| 3 | skills fn 同步 | `functions/skills/index.ts`：parseI18nPayload/applyI18n 扩七字段+tags；toRowValues/parseSkillInput/SKILL_COLUMNS 补 packageUrl |
| 4 | api 契约 | `src/api/skills.ts`：SkillInput/SkillRecord 加 packageUrl、i18n 七字段+tags；`src/api/upload.ts` 新建（uploadFile(file) → skills-upload） |
| 5 | mock | `src/mocks/skill-handlers.ts`（i18n 七字段+tags 回落；packageUrl 映射）+ `src/mocks/upload-handlers.ts` 新建；`src/mocks/browser.ts`/`server.ts` 登记 |
| 6 | UploadDropzone | `packages/ui/src/upload/upload-dropzone.tsx` + index 导出（受控、upload prop 注入、单/多文件、进度/失败/重试、图标补缺） |
| 7 | TagInput | `src/pages/marketplace/modal/tag-input.tsx`（模糊搜索现有标签 + 自由新建） |
| 8 | 表单重排 | `modal/form-state.ts` 重写（base/i18n 状态模型 + 载荷装配）+ `modal/skill-form-modal.tsx` 三区块重排 + 语言切换胶囊 + 编辑回填双请求 |
| 9 | 圆角联动 | 表单容器内联 `--radius-selector: var(--page-radius)`（daisyUI 控件自动跟随） |
| 10 | 语言包 | 两包新键（区块/提示/上传/切换），key 树一致 |
| 11 | 全量验证 | 见「验证命令」 |

## 关键实施注意

- **fn 映射四处同步**（spec 契约）：parseSkillInput / toRowValues / SKILL_COLUMNS /
  mock pickInput——packageUrl 新列漏一处 = PGRST204 或 mock 漂移；snake 列名
  断言用例必须扩展覆盖 package_url
- **mock 双路径登记**：upload-handlers 与 skill-handlers 同款 pagePaths
- **UploadDropzone 零耦合**：不 import api 层——upload 回调由 skills-web 注入
  （`upload: (file) => uploadFile(file)`）；BUILTIN_ICONS 缺 upload 字形先查后补
- **编辑回填双请求**：`get(id)`（基线）+ `get(id, 'en-US')`（译文）并行
  Promise.all；en 字段缺失回落基线展示（**保存空串 = 清译文**，语义要写注释）
- **en 与基线全同不提交**（design §3.2）：避免无意义译文行
- **tags 双落点**：zh 标签 → 主表 tags.styles；en 标签 → body.i18n['en-US'].tags
  ——styles 桶语义（原文不译）在表单场景即「该语言的标签原文」
- **--radius-selector 覆盖**：写在表单根容器 style（`'--radius-selector':
  'var(--page-radius)'`），加注释说明 daisyUI 控件圆角来源；Modal 内联的
  --page-radius 22px 兜底让独立态也有值
- **语言包候选键清理**：旧 tagCandidates/分节键（section.basic 等 12 节）随
  重排移除或复用——两包同步删，key 树 diff 必须为空
- **旧测试适配**：marketplace.test.tsx 表单弹窗用例的字段定位（名称 textbox
  锚定）可能受 label 变化影响——锚点 aria-labelledby 不变，字段查询按新 label
  语义修（断言语义不弱化）

## 验证命令

```bash
cd apps/iam-web && npx tsc -p supabase/functions/tsconfig.json
cd apps/skills-web && npx tsc --noEmit -p tsconfig.json && npx vitest run && pnpm build && npx oxlint src
cd apps/portal-web && npx tsc -b && npx vitest run
cd packages/ui && npx tsc --noEmit -p tsconfig.json && npx oxlint src
```

## 新增测试要点（skills-web）

| 用例 | 断言点 |
|---|---|
| i18n 七字段+tags 回落 | en 命中七字段各自覆盖；缺失字段回落基线；tags 按语言 |
| package_url 映射 | create 带 packageUrl → mock 原始行 package_url（snake 契约） |
| upload 契约 | uploadFile 返回 {url}；无权限 401/403；超限/类型错误 1014 |
| 表单切换语言 | 切 en → 名称显示译文（有）或基线（无）；切回 zh 不丢已填 |
| 提交裁剪 | en 与基线全同 → payload 无 i18n；en 有差异 → i18n['en-US'] 七字段+tags |
| 标签搜索 | 输入过滤现有标签；新建标签进 tags |

## 风险文件与回滚

| 文件 | 风险 | 缓解/回滚 |
|---|---|---|
| form-state.ts | 状态模型重写破坏既有用例 | 纯函数+单测先行；旧用例逐条迁移不弱化 |
| skills fn index.ts | i18n 扩展碰坏既有写路径 | parseI18nPayload 独立函数；tsc + 用例 |
| marketplace.test.tsx | 表单重排破坏字段定位 | aria 锚点不变；字段查询按新 label 修 |
| upload-dropzone | ui 包新组件泄漏业务 | upload prop 注入；oxlint + 零 import 检查 |

## 实施前检查清单

- [ ] prd / design 已评审（用户批准规划摘要）
- [ ] `task.py start` 已执行
- [ ] BUILTIN_ICONS upload 字形清点
- [ ] 0003 的 i18n 表当前列确认（task_expression 保留不 drop）
- [ ] mock 现有表单用例清单（marketplace.test.tsx 表单段）

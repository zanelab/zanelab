# skill-form-modal 三区块重构 + 上传组件 + Supabase Storage

## Goal

按用户设计稿重排 skill-form-modal：三区块布局 + 顶部语言切换（控制基础信息区）；
skills_i18n 副表扩到七个可译字段 + 标签按语言分桶；新增文件上传链路
（Supabase Storage + skills-upload edge fn + 前端 drop/choose 组件）；输入框
圆角联动 `--page-radius`。

## Background（用户决策，2026-11-25）

- **D1 列保留不回退**：11-24-skills-detail-schema 建的 22 列全保留；表单只做
  精简录入面（未列字段由种子/接口维护）。**前提**：数据模型必须包住精简列。
- **D2 上传全链路一起做**：Supabase Storage + edge fn + 前端组件（用户拍板
  「一起做」，推翻此前 Out of Scope）。
- **D3 枚举字段保留胶囊多选**：输出类型/适用角色/适用场景/支持 Agent 是固有
  枚举（ChipGroup），不改为自由输入。
- **D4 语言切换只控基础信息区**：顶部居中语言胶囊（zh-CN/en-US = i18n
  SUPPORTED）；默认展示**站点当前语言**对应数据（无译文回落基线）；切换后
  名称/简介/详细描述/交付内容/适合/不适合/标签 七字段读写该语言的译文。
- **D5 标签自由输入 + 模糊搜索**：输入时模糊匹配**现有标签**（全库已有标签
  去重集），可新建；tags 按语言分桶（决策见下）。

## Requirements

### R1 skills_i18n 副表扩展（迁移 0004）

- 列扩为：`title, summary, description, deliverables, good_fit, not_for, tags`
  （七个可译字段 + 标签；task_expression 保留但不入表单，暂从副表移除——
  **列从 0003 的四列调整**：删 task_expression、加四个新列；语言无关内容
  （requirements 等）仍在主表）
- **tags 按语言分桶**：副表 tags 列结构与主表一致（`{scenarios,tasks,highlights,styles}`
  → 简化桶；该语言的标签集）。主表 tags = 基线语言（zh-CN）标签。
- 回落规则不变：副表字段 null/缺失 → 用主表基线

### R2 上传链路（Storage + edge fn + 前端组件）

- **迁移 0004**：Storage bucket `skill-assets`（public read）；主表加
  `package_url text not null default ''`（技能包单文件 URL）
- **edge fn `skills-upload`**（新函数目录）：POST multipart 文件 → 校验
  （类型白名单：zip/png/jpg/webp/mp4/webm；大小上限 50MB）→ service role
  写 Storage `skill-assets/<skill-key>/<timestamp>-<filename>` → 返回
  `{ url }`；鉴权 requirePermission('skills:skill:update' 或 'create'——
  与写技能同码）
- **前端上传组件**（packages/ui 下沉 `UploadDropzone`）：drop + 点击 choose、
  文件列表（名称/大小/移除）、上传中进度态、失败重试、单/多文件模式、
  accept 限制；圆角跟 --page-radius
- **消费**：技能包（单文件 zip）→ package_url；效果展示（多文件图片/视频）
  → media JSONB（kind 按 mime 推断，order 按添加序）

### R3 表单三区块重排（skill-form-modal）

- 顶部：居中语言切换胶囊（zh-CN/en-US，取 i18n SUPPORTED）；只影响区块一
- **区块一 基本信息**（可译字段，随语言切换读写 i18n 行）：
  名称(Input) / 简介(Textarea 3 行, markdown 提示) / 详细描述(Textarea 5 行,
  markdown 提示) / 交付内容(Textarea 3 行, 每行一条) / 适合(3 行, 每行一条) /
  不适合(2 行, 每行一条) / 标签(标签输入 + 现有标签模糊搜索，多标签)
- **区块二 详细配置**：版本(Input) / 输出类型(胶囊枚举) / 适用角色(胶囊枚举) /
  适用场景(胶囊枚举) / 支持 Agent(胶囊枚举) / 定价(免费|付费 二选一) /
  价格(窄 Input，免费隐藏) / 技能包(单文件 drop+choose)
- **区块三 展示与演示**：演示地址(Input) / 效果展示(多文件 drop+choose)
- 分割线：浅灰 border-base-300；区块标题保留小节标题
- **样式**：label 上、输入下、左对齐；输入框背景走 theme token（bg-base-200）；
  **圆角联动 --page-radius**（input/textarea/select/dropzone 全部
  `rounded-(--page-radius)`，小控件如胶囊仍 rounded-full）

### R4 api / mock 契约同步

- SkillInput/SkillRecord 加 packageUrl；tags 语义变更（按语言）
- 表单提交：基础信息区按「当前切换语言」产出——zh-CN → 主表字段；en-US →
  body.i18n['en-US']（含 tags）
- mock：skills-upload handler（模拟延迟 + 返回假 URL）；i18n 行为同步（七字段
  + tags 回落）
- **标签模糊搜索数据源**：列表接口返回的现有 tags 去重集（前端聚合即可，无新端点）

### R5 语言包

- 新键：区块标题、markdown/每行一条提示、上传相关（拖拽提示/选择文件/移除/
  上传中/失败重试）、语言切换 aria；两包 key 树一致

## Out of Scope

- 存储桶的运维配置（云端控制台手动建/确认；迁移只管本地 dev 与 SQL 定义）
- 表单不录的列（task_expression/tone/rating/score/likes/reviews_count/
  demo_examples/requirements/generates_with/uses_tools/price_note/
  requires_api_key）——保留由种子维护
- 已录旧数据的多语言回填（旧数据只有基线，译文空缺回落即可）

## Acceptance Criteria

- [ ] AC1：迁移 0004 幂等（bucket SQL 定义 + package_url 列 + i18n 表列调整）；
      旧数据不丢
- [ ] AC2：skills-upload fn 编译通过、类型/大小校验、返回 URL 结构契约；
      mock 同构
- [ ] AC3：UploadDropzone 组件单/多文件模式、drop+choose、进度/失败态可用
      （skills-web 消费通过）
- [ ] AC4：三区块布局与设计稿一致；语言切换只影响区块一（zh 编辑主表、en
      编辑副表；切换时数据随语言加载，无译文回落基线）
- [ ] AC5：标签输入支持模糊搜索现有标签 + 自由新建；tags 按语言分桶落库
- [ ] AC6：输入框/文本域/dropzone 圆角跟 --page-radius；背景色走 theme token
- [ ] AC7：语言包两包 key 树一致；四包 tsc/build/lint 全绿 + skills-web
      vitest 全过（含新增：i18n 七字段+tags 回落、上传契约、表单区块用例）

## Key Decisions

- D1–D5 见 Background（均为用户决策 2026-11-25）
- **D6 tags 按语言分桶**（用户决策 2026-11-25：i18n 含标签）：副表 tags 结构
  与主表 tags 同构，均为该语言的标签数组
- **D7 上传走 edge fn 转存**（我的设计决策）：不经前端直传 Storage——写权限
  收敛在 fn（publishable key 直写桶需放行 storage 写策略，攻击面大）；fn 校验
  类型/大小后用 service role 转存
- **D8 UploadDropzone 下沉 packages/ui**（我的设计决策）：portal/iam 后续
  可复用；样式 token 化

## Open Questions

- 无阻塞项

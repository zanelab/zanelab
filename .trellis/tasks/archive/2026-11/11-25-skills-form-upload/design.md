# Design — 表单三区块重构 + 上传链路 + i18n 副表扩展

## 1. 数据层

### 1.1 迁移 0004（一个文件，三件事）

```sql
-- ① i18n 副表列调整（0003 的四列 → 七列 + tags；删 task_expression）
alter table public.skills_i18n
  add column if not exists deliverables jsonb not null default '[]'::jsonb,
  add column if not exists good_fit jsonb not null default '[]'::jsonb,
  add column if not exists not_for jsonb not null default '[]'::jsonb,
  add column if not exists tags jsonb not null default '{}'::jsonb;
-- task_expression 列保留（表单不录，已有数据不丢）——不 drop，避免破坏性迁移

-- ② 技能包列
alter table public.skills
  add column if not exists package_url text not null default '';

-- ③ Storage bucket（幂等）
insert into storage.buckets (id, name, public)
values ('skill-assets', 'skill-assets', true)
on conflict (id) do nothing;
```

### 1.2 i18n 回落矩阵（七字段 + tags）

| 字段 | 主表（基线 zh-CN） | 副表（译文，null = 回落） |
|---|---|---|
| title | title (text) | title (text) |
| summary | summary (text) | summary |
| description | description (text) | description |
| deliverables | deliverables (jsonb 数组) | deliverables |
| good_fit | good_fit (jsonb 数组) | good_fit |
| not_for | not_for (jsonb 数组) | not_for |
| tags | tags (jsonb 桶) | tags（该语言桶） |

**fn 详情回落 applyI18n 扩展**：七字段 + tags 逐字段覆盖（null → 保留基线）。

### 1.3 fn 写路径

- `parseI18nPayload` 扩：四字段 → 七字段 + tags（deliverables/good_fit/not_for
  数组、tags 对象）
- `applyI18n` 扩：同上逐字段
- 主表写路径补 `packageUrl → package_url`（toRowValues / parseSkillInput /
  SKILL_COLUMNS / mock pickInput 四处同步——spec 映射契约）

## 2. 上传链路

```
UploadDropzone（前端）
  → POST multipart/form-data → /functions/v1/skills-upload
     （requirePermission skills:skill:create|update）
  → fn：类型/大小校验 → service role Storage.upload
     path: skill-assets/<yyyyMMdd>/<random>-<filename>
  → 返回 { url: <public URL> }
  → 表单拿 URL：
     技能包 → packageUrl（单文件，重复上传替换）
     效果展示 → media[]（追加，kind 按 mime；order = 添加序）
```

**fn 实现要点**：
- `req.formData()` 读 File；白名单 `['zip','png','jpg','jpeg','webp','gif','mp4','webm']`（按扩展名 + mime 双校验）
- 大小上限 50MB（`file.size`）
- Storage 公开 URL：`/storage/v1/object/public/skill-assets/<path>`
- 错误码沿用 envelope：1001 invalidBody / 1010/1011 鉴权 / 1014 校验（超限/类型）/ 500
- **本地 dev**：`supabase start` 自带 Storage（storage-api 容器），零额外配置

### mock 同构（skill-handlers 或新 upload-handlers）

- POST `/functions/v1/skills-upload`（双路径登记）：校验文件字段存在 → 延迟
  → 返回 `https://mock.storage/skill-assets/<filename>`；无权限 403/401 同款

## 3. 前端组件

### 3.1 UploadDropzone（packages/ui/src/upload/）

```ts
interface UploadDropzoneProps {
  multiple?: boolean;            // 多文件（效果展示）；缺省单文件
  accept?: string;               // mime 列表（input accept 透传）
  maxSizeMB?: number;            // 缺省 50
  upload: (file: File) => Promise<{ url: string }>;  // 上传函数（调用方注入——组件不感知 api 层）
  value?: UploadedFile[];        // 受控：已上传文件列表
  onChange?: (files: UploadedFile[]) => void;
  label?: ReactNode;
  hint?: ReactNode;
}
interface UploadedFile { name: string; size: number; url: string; kind: 'image'|'video'|'file'; }
```

- 形态：虚线 drop 区（dragover 高亮）+ 点击 choose；文件列表行（图标/名称/
  大小/移除钮）；上传中行（spinner）；失败行（错误文案 + 重试）
- 单文件模式：新上传**替换**旧文件（列表长度 1）
- **组件不内置 api 调用**：`upload` prop 注入——packages/ui 零耦合红线
- 样式：背景 `bg-base-200`、虚线 `border-base-300`、圆角 `rounded-(--page-radius)`
  （内联 22px 兜底，同 Modal 壳做法）
- 图标：drop 区用 AppIcon（查 BUILTIN_ICONS：'external-link' 类；无 upload
  字形则补 `upload: paths ['M12 16V4','m6 8 6-6 6 6','M4 20h16']`——含箭头托盘）

### 3.2 表单语言切换与数据读写

**状态模型**（form-state.ts 重写）：

```ts
interface SkillFormState {
  base: {    // 语言无关（区块二/三）
    version: string; outputTypes: OutputType[]; roles: string[];
    scenes: string[]; agents: string[];
    priceKind: 'free'|'paid'; priceAmount: string;
    packageUrl: UploadedFile[];      // 单文件
    tryOnlineUrl: string;
    media: UploadedFile[];           // 效果展示多文件
  };
  i18n: Record<SkillsLocale, I18nFields>;   // 区块一：两语言的字段集
  activeLocale: SkillsLocale;               // 顶部切换；初始 = 站点当前语言
}
interface I18nFields {
  title: string; summary: string; description: string;
  deliverables: string; goodFit: string; notFor: string;   // 每行一条文本
  tags: string[];                                          // 该语言标签
}
```

- **加载**（编辑回填）：详情接口不带 locale（拿基线）+ 带 en（拿译文）两次请求
  → base 落基线字段；i18n['zh-CN'] = 基线，i18n['en-US'] = 译文（缺失字段回落
  基线值展示，保存时空串 = 清译文 → 回落）
- **切换语言**：仅切 activeLocale，区块一字段绑 `i18n[activeLocale]`；区块二/三
  不动
- **提交**：
  - 主表字段 ← base + i18n['zh-CN']（基线恒写）
  - `i18n['en-US']` 仅当 en 内容与基线**不同**才携带（与基线全同 = 不提交该
    locale，避免无意义译文行）
  - tags：i18n['zh-CN'].tags → 主表 tags.styles 桶（原文）；i18n['en-US'].tags
    → body.i18n['en-US'].tags

### 3.3 标签模糊搜索

- 数据源：`skillsApi.list()` 已返回全部技能 → 前端聚合所有行的 tags.styles
  ∪ tags.scenarios/tasks/highlights 展示值 → Set 去重
- 交互：输入触发 includes 过滤（大小写不敏感）下拉候选；Enter/点击选中为标签；
  Backspace 删除末标签；标签本身按当前语言存储
- 实现：简单受控组件（`TagInput`，modal 目录内；不做通用组件下沉——只有此处用）

### 3.4 圆角联动

- 弹窗内 input/textarea/select：`rounded-(--page-radius)`（替换现 `rounded` 类；
  输入框类 daisyUI 圆角由 `--radius-selector` 控制，需覆盖为变量——**做法**：
  在 skills-web 的表单容器上内联 `--radius-selector: var(--page-radius)`，
  daisyUI 控件自动跟随，零逐类改写）
- UploadDropzone 组件内联兜底同 Modal

## 4. 权衡记录

| 决策 | 备选 | 取舍 |
|---|---|---|
| 上传走 fn 转存 | 前端直传 Storage（签 URL） | fn 转存简单且鉴权单一；代价是文件过 fn（50MB 上限内可接受）；签 URL 直传是云原生做法但需要 storage 签名端点，本期不做 |
| tags 按语言分桶（用户定） | 标签语言无关 | 标签本质是内容（如中文场景名），各语言不同合理；代价是跨语言标签不互通（搜索按当前语言集） |
| UploadDropzone upload prop 注入 | 组件内调 api | ui 包零耦合红线（不能 import app api 层）；注入式让 portal/iam 可复用 |
| i18n en 与基线全同时不提交 | 恒提交 | 避免无意义译文行堆积；回落语义下效果等价 |
| 圆角走 --radius-selector 变量覆盖 | 逐控件加 rounded-(--page-radius) | 一处内联覆盖全部 daisyUI 控件；代价是理解成本（注释说明） |

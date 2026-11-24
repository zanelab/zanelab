# Design — skills 详情页数据模型重构 + 表单动态分节

## 1. 表结构

### 1.1 skills 主表（新增列，0003 迁移）

```sql
-- 版本与用途
version text not null default '1.0.0',
task_expression text not null default '',        -- 一句话用途（基线语言）
summary text not null default '',                -- 卡片/采集卡描述（基线语言）
description text not null default '',            -- 详情长描述（基线语言）

-- 定价三态
price_kind text not null default 'free'
  check (price_kind in ('free','paid','requires_key')),
price_amount numeric(10,2),                      -- paid 用
price_note text not null default '',             -- requires_key：Needs XXX_API_KEY
requires_api_key text[] not null default '{}',

-- 统计（D5：rating 作者自评保留；score 用户均分新增）
likes int not null default 0,
score numeric(2,1),                              -- 用户评分均值（评论数 reviews_count）
reviews_count int not null default 0,

-- 内容结构（JSONB）
media jsonb not null default '[]'::jsonb,
demo_examples jsonb not null default '[]'::jsonb,
deliverables jsonb not null default '[]'::jsonb,
good_fit jsonb not null default '[]'::jsonb,
not_for jsonb not null default '[]'::jsonb,
requirements jsonb not null default '{}'::jsonb,
tags jsonb not null default '{}'::jsonb,

-- 兼容与能力
generates_with text[] not null default '{}',     -- 驱动模型
uses_tools text[] not null default '{}',         -- 外部工具
try_online_url text not null default '',         -- web 类在线试用
```

**旧列处理**：`roles` / `scenes` 保留但**降级为兼容列**（新写入不再填；读取时若
`tags` 为空则回落旧列，保证旧数据/旧客户端不空）。`output_types` 保留为主维度
（不被 tags 取代——它是筛选主键）。`tone`/`featured`/`free`/`downloads`/`bookmarks`
保留原义（`free` 与新 `price_kind` 冗余：写入时由 price_kind 推导 free 保持一致）。

### 1.2 skills_i18n 副表

```sql
create table if not exists public.skills_i18n (
  skill_id bigint not null references public.skills(id) on delete cascade,
  locale text not null,                          -- 'en-US' / 'zh-CN' …
  title text,
  summary text,
  description text,
  task_expression text,
  primary key (skill_id, locale)
);
```

- **只存译文**：某字段为空（null）表示该 locale 无此译文 → 回落主表基线
- 查询：`select * from skills_i18n where skill_id = $1 and locale = $2`（单行命中）
- 写路径：随 skill 提交 `i18n?: Record<locale, Partial<I18nFields>>`；fn 侧
  upsert（缺 locale 则跳过）

### 1.3 标签 JSONB 结构（R2）

```jsonc
{
  "scenarios":  ["web-design", "product-launch"],   // i18n key（可翻译）
  "tasks":      ["build-landing-page"],             // i18n key（可翻译）
  "highlights": ["style-locked", "editable-output"],// i18n key（可翻译）
  "styles":     ["Bento Grid", "Soft Glow"]         // 原文（不翻译）
}
```

- 渲染期：scenarios/tasks/highlights 经 `t('skills.tags.<key>')` 解析；styles 直出
- 值域治理：i18n key 必须在语言包有对应条目（表单里从语言包候选列表选，不自由输入）

### 1.4 其他 JSONB 结构

```jsonc
media:        [{ "kind": "image"|"video", "url": "...", "alt": "...", "order": 0 }]
demo_examples:[{ "prompt": "...", "mediaUrl": "...", "mediaKind": "image", "caption": "..." }]
requirements: { "bring": ["..."], "dependencies": ["..."], "outside_costs": ["..."],
                "last_tested": "v1.0.1 — Claude Code / Codex" }
```

## 2. 数据流与契约

```
表单（skills-web）
  → skillsApi.create/update(SkillInput)
      ├─ 主表字段（基线语言）→ POST/PUT /skills
      └─ i18n 副表字段      → 同请求 body.i18n，fn 内 upsert skills_i18n
  → edge fn parse → toRowValues（camel→snake + JSONB 结构）→ insert/update
  → 回读 record.ts（行 → SkillRecord/SkillItem）
```

**SkillInput 契约**（`src/api/skills.ts`，camelCase 对外，fn 内转 snake）：

```ts
interface SkillInput {
  title: string; summary?: string; description?: string; taskExpression?: string;
  version?: string;
  free?: boolean; featured?: boolean;              // 兼容旧列
  price?: { kind: 'free'|'paid'|'requires_key'; amount?: number; note?: string;
            requiresApiKeys?: string[] };
  outputTypes: OutputType[]; roles?: string[]; scenes?: string[];  // 兼容旧列
  tags?: { scenarios?: string[]; tasks?: string[]; highlights?: string[];
           styles?: string[] };
  media?: SkillMedia[]; demoExamples?: SkillDemo[]; deliverables?: string[];
  goodFit?: string[]; notFor?: string[];
  requirements?: { bring?: string[]; dependencies?: string[];
                   outsideCosts?: string[]; lastTested?: string };
  rating?: number; score?: number; reviewsCount?: number; likes?: number;
  downloads?: number; bookmarks?: number; tone?: string; agents?: string[];
  generatesWith?: string[]; usesTools?: string[]; tryOnlineUrl?: string;
  i18n?: Record<string, { title?: string; summary?: string; description?: string;
                           taskExpression?: string }>;   // locale → 译文
}
```

**fn 写映射**（`toRowValues`，扩展既有 camel→snake 映射——spec 已沉淀此模式）：

| camel（输入） | snake（列） |
|---|---|
| taskExpression | task_expression |
| priceKind / priceAmount / priceNote | price_kind / price_amount / price_note |
| requiresApiKey | requires_api_key |
| demoExamples | demo_examples |
| goodFit / notFor | good_fit / not_for |
| generatesWith | generates_with |
| usesTools | uses_tools |
| tryOnlineUrl | try_online_url |
| reviewsCount | reviews_count |

JSONB 列（media/tags/...）直接整体赋值（结构在 API 契约层已定，fn 不拆解）。

**读取契约**：
- 列表 `GET /skills`：只读主表基线（不 join 副表）→ `SkillItem` 摘要视图
- 详情 `GET /skills/:id?locale=en-US`：主表 + 副表覆盖 → `SkillRecord` 全字段
  - 回落规则：`i18n[locale]?.field ?? main.field`

## 3. 前端表单：按输出类型动态分节

### 3.1 分节渲染机制

```tsx
// 选中的输出类型 → 渲染哪些专属分节（多选 = 并集）
const SECTIONS_BY_OUTPUT: Record<OutputType, SectionId[]> = {
  网页:   ['web'],
  幻灯片: ['slides'],
  视频:   ['video'],
  图像:   ['image'],
};
// 输出类型变化 → activeSections = 选中类型对应分节的并集
```

- 专属分节的**字段值在切换输出类型时保留**（不清空——用户误触不丢数据；提交时
  只提交 activeSections 涉及的类型专属字段，其余置空/保留但不落库）
- 每个专属分节在表单里是独立 Field 组，标题/说明走 t('skills.form.section.*')

### 3.2 专属字段清单

| 分节 | 字段 | 依据（参考站实测） |
|---|---|---|
| web | 在线试用 URL、页面/技术栈标签 | "No install needed: try it free in your browser" |
| slides | 导出格式（PPTX/在线）、页数范围、演讲者备注 | "editable PowerPoint export: text and notes remain editable" |
| video | 时长、分辨率（4K/1080p）、配音语言、所需 API key | "A 40-second launch MP4 in 4K or 1080p, English or Chinese" + "Needs ELEVENLABS_API_KEY" |
| image | 示例图集、风格标签、尺寸/比例 | image 类详情页示例图集 + style 标签 |

### 3.3 i18n 录入区

- 基线语言区（zh-CN）：标题/一句话用途/摘要/描述 —— 直接落主表
- 译文区：语言下拉（语言包现有 locale 列表）+ 四个文本字段；**留空 = 回落基线**
  （副表该字段写 null）；提供「复制基线文案」辅助按钮

### 3.4 标签录入

- scenarios/tasks/highlights：从语言包候选（`skills.form.tagCandidates.*`）多选
- styles：自由输入（逗号分隔 → 数组），不翻译

## 4. 兼容与迁移

- **旧数据不丢**：0003 迁移用 `update ... set tags = jsonb_build_object('scenarios', scenes, ...)`
  把旧 roles/scenes 折进 tags（旧值原样进 styles 或 tasks——**决定**：旧 roles/scenes
  进 `tasks`（场景/任务同族），不丢信息）
- **旧 API 消费者**：输出字段名不变（outputTypes/roles/scenes/rating/tone/agents…），
  新字段全为可选 → 旧客户端不受影响
- **回滚点**：迁移是加列（不改旧列语义）→ revert 代码即可；迁移本身向后兼容

## 5. 权衡记录

| 决策 | 备选 | 取舍 |
|---|---|---|
| i18n 副表（行级） | JSONB 多语言列 | 副表可按 locale 精确查、能给译文加约束；代价是详情查询多一次 join（可接受，详情页低频） |
| 标签 JSONB 四桶 | 枚举表 + 翻译表 | JSONB 桶让「翻译 vs 不翻译」显式、写入免多表事务；代价是值域靠应用层校验（表单从语言包选 key 来兜） |
| 媒体 JSONB 单列 | 独立 media 子表 | 单列写入简单、无排序 join；代价是没法跨技能复用媒体（当前不需要） |
| rating 与 score 共存 | 统一替换 | 两个语义真实不同（作者自评 vs 用户均分）；共存成本仅一列 |
| 详情页另立项 | 同任务做 | 数据层先被表单/接口消费验证，避免 UI 与未定型的结构耦合 |

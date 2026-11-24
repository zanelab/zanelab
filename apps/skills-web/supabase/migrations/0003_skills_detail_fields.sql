-- 0003: skills 详情页字段 + i18n 副表（任务 11-24-skills-detail-schema）
--
-- 依据：skillry.dev 详情页实测（web/slides/video/image 四类 + 中英对照）。
-- 设计见 .trellis/tasks/11-24-skills-detail-schema/design.md §1。
--
-- 存储约定（D1–D3）：
-- - i18n：主表存**基线语言**（zh-CN）内容；skills_i18n 副表**只存译文**
--   （字段为 null = 该 locale 无此译文 → 回落基线）。列表接口只读主表
--   （不 join，N+1 零成本）；详情接口按 locale join。
-- - 标签：tags jsonb 四桶 {scenarios,tasks,highlights,styles}——前三类存
--   i18n key（渲染期 t() 解析，可翻译），styles 存原文（品牌专名，不翻译）。
-- - 媒体/清单：JSONB 单列（media/demo_examples/deliverables/good_fit/not_for/
--   requirements）——结构由 API 契约层定义，fn 不拆解。
--
-- 幂等：全部 add column if not exists / create table if not exists；旧数据折
-- tags 用 where tags = '{}' 守卫（重复执行不覆盖新值）。

-- ---------- 主表新增列 ----------

alter table public.skills
  add column if not exists version text not null default '1.0.0',
  add column if not exists task_expression text not null default '',
  add column if not exists summary text not null default '',
  add column if not exists description text not null default '',

  -- 定价三态（free / paid / requires_key）
  add column if not exists price_kind text not null default 'free'
    check (price_kind in ('free','paid','requires_key')),
  add column if not exists price_amount numeric(10,2),
  add column if not exists price_note text not null default '',
  add column if not exists requires_api_key text[] not null default '{}',

  -- 统计（rating = 作者自评 1–5 整数；score = 用户评分均值）
  add column if not exists likes int not null default 0,
  add column if not exists score numeric(2,1),
  add column if not exists reviews_count int not null default 0,

  -- 内容结构（JSONB）
  add column if not exists media jsonb not null default '[]'::jsonb,
  add column if not exists demo_examples jsonb not null default '[]'::jsonb,
  add column if not exists deliverables jsonb not null default '[]'::jsonb,
  add column if not exists good_fit jsonb not null default '[]'::jsonb,
  add column if not exists not_for jsonb not null default '[]'::jsonb,
  add column if not exists requirements jsonb not null default '{}'::jsonb,
  add column if not exists tags jsonb not null default '{}'::jsonb,

  -- 兼容与能力
  add column if not exists generates_with text[] not null default '{}',
  add column if not exists uses_tools text[] not null default '{}',
  add column if not exists try_online_url text not null default '';

-- ---------- i18n 副表 ----------

create table if not exists public.skills_i18n (
  skill_id bigint not null references public.skills(id) on delete cascade,
  locale text not null,
  title text,
  summary text,
  description text,
  task_expression text,
  primary key (skill_id, locale)
);

alter table public.skills_i18n enable row level security;

drop policy if exists skills_i18n_public_read on public.skills_i18n;
create policy skills_i18n_public_read on public.skills_i18n
  for select using (true);

-- ---------- 旧数据折进 tags（roles/scenes → tasks 桶，不丢信息） ----------

update public.skills
set tags = jsonb_build_object(
  'scenarios', to_jsonb(scenes),
  'tasks', to_jsonb(roles),
  'highlights', '[]'::jsonb,
  'styles', '[]'::jsonb
)
where tags = '{}'::jsonb
  and (coalesce(roles, '{}') <> '{}'::text[] or coalesce(scenes, '{}') <> '{}'::text[]);

-- ---------- 列表页摘要：free 与 price_kind 保持一致 ----------

update public.skills
set free = (price_kind = 'free')
where free <> (price_kind = 'free');

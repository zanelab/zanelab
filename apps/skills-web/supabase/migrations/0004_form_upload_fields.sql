-- 0004: 表单三区块重构配套字段 + 上传存储（任务 11-25-skills-form-upload）
--
-- ① skills_i18n 副表扩展：deliverables/good_fit/not_for/tags（七可译字段 +
--    标签按语言分桶；task_expression 列保留不 drop——表单不再录入，已有数据
--    不丢，破坏性迁移不做）。
-- ② 主表 package_url：技能包单文件 URL（UploadDropzone 上传产物）。
-- ③ Storage bucket skill-assets（public read；写走 skills-upload edge fn，
--    service role 绕 RLS——与 skills 表同款安全模型）。
--
-- 幂等：add column if not exists / bucket on conflict do nothing。

-- ---------- ① i18n 副表扩展 ----------

alter table public.skills_i18n
  add column if not exists deliverables jsonb not null default '[]'::jsonb,
  add column if not exists good_fit jsonb not null default '[]'::jsonb,
  add column if not exists not_for jsonb not null default '[]'::jsonb,
  add column if not exists tags jsonb not null default '{}'::jsonb;

-- ---------- ② 主表技能包列 ----------

alter table public.skills
  add column if not exists package_url text not null default '';

-- ---------- ③ Storage bucket ----------

insert into storage.buckets (id, name, public)
values ('skill-assets', 'skill-assets', true)
on conflict (id) do nothing;

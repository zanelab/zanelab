-- 0008: skills 表（技能市场 CRUD 的存储层）
--
-- 列集对齐 skills-web 的 SkillItem 契约（data.ts）+ id/created_at/updated_at。
-- 数组列用 text[]：outputTypes/roles/scenes/agents 的值域由 edge fn 与前端
-- 约定承载（服务端不做白名单硬校验——筛选值是前端约定的语义，值域漂移由
-- 前端筛选自然吞掉；硬绑会让「后续加选项」变成 DB 变更）。
-- rating 1–5 check 保留（SkillItem 注释明确 1–5 整数）。
--
-- RLS：读策略 public select（技能市场匿名可浏览，父任务决策 D1）；写不给策略
-- —— publishable key 直连写不出去，写全部走 edge fn（service role 绕 RLS），
-- 与 iam menus 表「匿名可读、写走 requirePermission」同款。

create table if not exists public.skills (
  id bigint generated always as identity primary key,
  title text not null,
  free boolean not null default false,
  featured boolean not null default false,
  output_types text[] not null default '{}',
  roles text[] not null default '{}',
  scenes text[] not null default '{}',
  downloads int not null default 0,
  bookmarks int not null default 0,
  rating int not null default 3 check (rating between 1 and 5),
  tone text not null default 'primary',
  agents text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.skills enable row level security;

drop policy if exists skills_public_read on public.skills;
create policy skills_public_read on public.skills
  for select using (true);

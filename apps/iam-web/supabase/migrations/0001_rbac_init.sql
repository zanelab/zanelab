-- 0001: RBAC 数据底座（menus + roles + user_roles + role_permissions）
-- =====================================================================
-- 设计：.trellis/tasks/11-03-iam-menu-management/design.md DD1
--
-- - 字段沿用旧项目菜单契约（RawMenuItem）的命名：menu_type / scopes / pid /
--   parent——宿主 fetchMenus 的消费端（transformMenu）将来切数据源时零改动；
--   不做现代化改名（跨系统契约优先）。
-- - pid 外键 on delete cascade：删除父节点级联删子树（UI 层弹确认提示数量）。
-- - 初始化：首个注册用户 → admin，其余 → guest（auth.users INSERT 触发器，
--   「第一个拿到角色的人」判定 = user_roles 空表；并发窗口内理论上可双 admin，
--   内部管理系统注册频率下接受，不做分布式锁）。
-- - 幂等性：全部 create table if not exists / drop trigger if exists，
--   supabase db reset 重放安全。
-- - 不启用 RLS（design DD8）：Edge Fn 是唯一写入口，前端不直连 Postgres；
--   将来若引入 supabase-js 直查，必须先补 RLS。

-- ==================== 菜单表 ====================

create table if not exists public.menus (
  id bigint generated always as identity primary key,
  pid bigint references public.menus(id) on delete cascade,
  code text not null unique,
  parent text not null default 'root',
  name text not null,
  component text not null default '',
  uri text,
  type text not null check (type in ('app', 'menu', 'button', 'group')),
  sort int not null default 0,
  icon text,
  hidden boolean not null default false,
  scopes text[] not null default '{O}',
  menu_type int not null default 1, -- 0=目录 1=菜单 2=按钮（旧契约语义）
  created_at timestamptz not null default now()
);

comment on table public.menus is
  '菜单树（旧项目 RawMenuItem 契约）：宿主 fetchMenus 与 iam 菜单管理页共用的数据源';

-- ==================== 角色与权限 ====================

create table if not exists public.roles (
  id bigint generated always as identity primary key,
  code text not null unique, -- 'guest' / 'admin'
  name text not null
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id bigint not null references public.roles(id) on delete cascade,
  primary key (user_id, role_id)
);

create table if not exists public.role_permissions (
  role_id bigint not null references public.roles(id) on delete cascade,
  permission text not null, -- 权限码；admin 持 '*' 通配
  primary key (role_id, permission)
);

-- 种子角色（name 用 zh 缺省——页面展示文案将来经角色管理页可改）
insert into public.roles (code, name)
values ('admin', '系统管理员'), ('guest', '游客')
on conflict (code) do nothing;

-- 种子权限：admin 通配 + 菜单管理四码（guest 无权限码种子——只能看公开子集）
insert into public.role_permissions (role_id, permission)
select r.id, p.permission
from public.roles r,
     unnest(array['*', 'system:menu:list', 'system:menu:create', 'system:menu:update',
                  'system:menu:delete']) as p(permission)
where r.code = 'admin'
on conflict do nothing;

-- ==================== 注册初始化触发器 ====================

-- 首个注册用户 → admin，其余 → guest（design DD1）。
-- security definer：触发器需要写 user_roles，而触发时的调用者（auth flow）
-- 无公开表权限；锁定 search_path 防函数劫持。
create or replace function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role_id)
  select new.id, r.id
  from public.roles r
  where r.code = case
    when not exists (select 1 from public.user_roles) then 'admin'
    else 'guest'
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
execute function public.handle_new_user();

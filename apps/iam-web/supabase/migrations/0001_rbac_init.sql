-- 初始化迁移：RBAC 数据底座 + 菜单表

-- ==================== 菜单表 ====================

create table if not exists public.menus (
  id bigint generated always as identity primary key, -- 主键
  pid bigint references public.menus(id) on delete cascade, -- 父级菜单 id（级联删除子树）
  code text not null unique, -- 资源编码（唯一）
  name text not null, -- 菜单名称
  component text, -- 组件名称（前端组件标识）
  uri text, -- 路由路径
  type text not null check (type in ('app', 'menu', 'button', 'group')), -- 菜单类型
  sort int not null default 0, -- 排序权重（越小越靠前）
  icon text, -- 菜单图标
  active_icon text, -- 激活态菜单图标
  hidden boolean not null default false, -- 是否隐藏
  scopes text[] not null default '{C}', -- 适用范围：A=管理端 / C=客户端（含 C 即游客可见）
  created_at timestamptz not null default now() -- 创建时间
);

-- ==================== 角色与权限 ====================

create table if not exists public.roles (
  id bigint generated always as identity primary key,
  code text not null unique, -- 角色编码：'admin' / 'guest'
  name text not null -- 角色名称
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade, -- 用户 id
  role_id bigint not null references public.roles(id) on delete cascade, -- 角色 id
  primary key (user_id, role_id)
);

create table if not exists public.role_permissions (
  role_id bigint not null references public.roles(id) on delete cascade, -- 角色 id
  permission text not null, -- 权限码（admin 持 '*' 通配）
  primary key (role_id, permission)
);

-- 种子角色与权限：admin 通配全部权限码；guest 无权限码（只能看公开子集）
insert into public.roles (code, name)
values ('admin', '系统管理员'), ('guest', '游客')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission)
select r.id, p.permission
from public.roles r,
     unnest(array['*']) as p(permission)
where r.code = 'admin'
on conflict do nothing;

-- ==================== 注册初始化触发器 ====================

-- 首个注册用户 → admin，其余 → guest
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

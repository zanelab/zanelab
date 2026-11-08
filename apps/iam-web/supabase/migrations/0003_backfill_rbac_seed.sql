-- 0003: 补种 RBAC 角色/权限 + 为存量用户回填角色
--
-- 云端 roles / role_permissions / user_roles 为空（0001 的种子未生效或被清空），
-- 导致 userPermissions 对所有人（含 admin）返回空集 → requirePermission 一律 403。
-- 本迁移幂等，可安全 db push。

-- 角色种子
insert into public.roles (code, name)
values ('admin', '系统管理员'), ('guest', '游客')
on conflict (code) do nothing;

-- admin 通配权限
insert into public.role_permissions (role_id, permission)
select r.id, '*'
from public.roles r
where r.code = 'admin'
on conflict (role_id, permission) do nothing;

-- guest 读码（可见管理菜单 + 放行 user/role 读端点）
insert into public.role_permissions (role_id, permission)
select r.id, p.permission
from public.roles r,
     unnest(array['system:menu:list', 'system:user:list', 'system:role:list']) as p(permission)
where r.code = 'guest'
on conflict (role_id, permission) do nothing;

-- 存量用户回填角色：最早创建的用户 → admin，其余 → guest
-- （触发器 handle_new_user 只对新注册用户生效，老用户须手动回填）
insert into public.user_roles (user_id, role_id)
select u.id, r.id
from (
  select id, row_number() over (order by created_at) as rn
  from auth.users
) u
join public.roles r
  on r.code = case when u.rn = 1 then 'admin' else 'guest' end
on conflict (user_id, role_id) do nothing;

-- 兜底重建注册触发器（幂等）：首个注册用户 → admin，其余 → guest。
-- 与 0001 同定义；若 0001 的触发器因故缺失，此处补齐。
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

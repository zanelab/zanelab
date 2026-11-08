-- 0005: 角色编辑/删除 + 内置角色保护列
--
-- 角色管理页加「编辑/删除」操作：roles 表加 built_in 标记（admin/guest 种子角色
-- 置 true），服务端拒绝编辑/删除内置角色；新增 system:role:create / role:update /
-- role:delete 权限码节点（按钮层级，随种子菜单树入树供授权）。

-- 内置角色标记：true = 系统初始化角色，不允许编辑/删除（admin/guest）
alter table public.roles add column if not exists built_in boolean not null default false;

-- 种子角色打标（幂等）
update public.roles set built_in = true where code in ('admin', 'guest');

-- 菜单表为空时（0004 的守卫语义）补按钮节点：角色管理页的操作权限码
do $$
declare
  v_roles bigint;
begin
  if not exists (select 1 from public.menus limit 1) then
    return; -- 菜单树未种（0004 未跑/被清）→ 由 0004 重跑补齐，此处跳过
  end if;

  select id into v_roles from public.menus
  where permission = 'system:role:list' and type = 'menu' limit 1;
  if v_roles is null then
    return; -- 角色管理菜单节点不存在（环境自定义结构）→ 不强行插入
  end if;

  insert into public.menus
    (pid, permission, name, component, uri, type, sort, hidden, scopes)
  values
    (v_roles, 'system:role:create', '新建角色', null, null, 'button', 2, false, '{A}'),
    (v_roles, 'system:role:update', '编辑角色', null, null, 'button', 3, false, '{A}'),
    (v_roles, 'system:role:delete', '删除角色', null, null, 'button', 4, false, '{A}')
  on conflict do nothing;
end $$;

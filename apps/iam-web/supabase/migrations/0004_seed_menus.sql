-- 0004: 种子菜单树（导航节点 + 按钮操作权限节点）
--
-- 菜单表为空 → 宿主 flattenPermissions 拿不到任何按钮权限码（system:menu:create
-- 等）→ 前端 <Permission code> 把「新建菜单」等操作按钮全藏了（admin 也一样）。
-- RBAC 的按钮级控制靠菜单树里的 button 节点承载操作码，须先种一份标准结构。
-- 只在 menus 为空时种（幂等：用户已建菜单则跳过，避免重复）。

do $$
declare
  v_home bigint;
  v_sys bigint;
  v_users bigint;
  v_menus bigint;
  v_roles bigint;
begin
  if exists (select 1 from public.menus limit 1) then
    return;
  end if;

  -- 导航节点
  insert into public.menus
    (pid, permission, name, component, uri, type, sort, icon, active_icon, hidden, scopes)
  values
    (null, null, '首页', null, '/home', 'menu', 0, 'home', 'home-active', false, '{C}')
  returning id into v_home;

  insert into public.menus
    (pid, permission, name, component, uri, type, sort, icon, active_icon, hidden, scopes)
  values
    (null, null, '系统管理', 'iam', '/iam', 'app', 3, 'system', 'system-active', false, '{C}')
  returning id into v_sys;

  insert into public.menus
    (pid, permission, name, component, uri, type, sort, hidden, scopes)
  values
    (v_sys, 'system:user:list', '用户管理', null, '/users', 'menu', 1, false, '{C}')
  returning id into v_users;

  insert into public.menus
    (pid, permission, name, component, uri, type, sort, hidden, scopes)
  values
    (v_sys, 'system:menu:list', '菜单管理', null, '/menus', 'menu', 2, false, '{C}')
  returning id into v_menus;

  insert into public.menus
    (pid, permission, name, component, uri, type, sort, hidden, scopes)
  values
    (v_sys, 'system:role:list', '角色管理', null, '/roles', 'menu', 3, false, '{C}')
  returning id into v_roles;

  -- 按钮节点（操作权限码，供前端按钮级控制 + 后端 requirePermission 值域）
  insert into public.menus
    (pid, permission, name, component, uri, type, sort, hidden, scopes)
  values
    (v_users, 'system:user:assign', '分配角色', null, null, 'button', 1, false, '{A}'),
    (v_users, 'system:user:ban', '禁用用户', null, null, 'button', 2, false, '{A}'),
    (v_menus, 'system:menu:create', '新增菜单', null, null, 'button', 1, false, '{A}'),
    (v_menus, 'system:menu:update', '编辑菜单', null, null, 'button', 2, false, '{A}'),
    (v_menus, 'system:menu:delete', '删除菜单', null, null, 'button', 3, false, '{A}'),
    (v_roles, 'system:role:assign', '保存授权', null, null, 'button', 1, false, '{A}');
end $$;

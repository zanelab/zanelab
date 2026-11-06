-- 0002: 权限体系重构（语义权限码 permission + 删冗余 code）

-- 菜单授权锚点：permission 存语义权限码（system:menu:list 等）
-- 目录/菜单节点 = 进入权限；按钮节点 = 操作权限；空 = 公开（所有登录用户可见）
alter table public.menus add column if not exists permission text;

-- 删 code：11-04 把「唯一标识」与「权限码」错误合并的产物——有语义的消费
-- （可见性过滤、授权值域校验、按钮权限码）迁到 permission，纯标识职责回归主键 id
alter table public.menus drop column if exists code;

-- guest 读码种子：给 guest 保持「管理菜单可见（只读）」——菜单节点的 permission
-- （system:user/menu/role:list）命中才出现在登录用户的过滤菜单树里；user/role
-- 读端点（GET /auth/users、/auth/roles）也按这些码鉴权。写操作（create/update/
-- delete/assign/ban）guest 一律无码 → 403。
insert into public.role_permissions (role_id, permission)
select r.id, p.permission
from public.roles r,
     unnest(array['system:menu:list', 'system:user:list', 'system:role:list']) as p(permission)
where r.code = 'guest'
on conflict do nothing;

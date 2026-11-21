-- 0006: 补种 skills 按钮权限节点（skills:skill:create「上传 Skill」）
--
-- 0004 只种了 system 域按钮码（幂等守卫「menus 非空即跳过」），且 skills 接入
-- 后在 iam 菜单管理页才建 skills app 节点——skills:skill:create 按钮节点从未入库，
-- 前端 flattenPermissions 拿不到该码 → skills-web 的 <Permission code="skills:skill:create">
-- 对所有账号（含 admin）都不放行，「上传 skills」入口不可见。
--
-- 幂等：**不复用** 0004 的「menus 非空即跳过」守卫（库此时非空）——改为
-- 「不存在 permission='skills:skill:create' 行才插入」，可重复执行。
-- 父节点：component='skills' 的 app 节点；不存在则 SELECT 无行、整体零插入
-- （不硬造父节点，待 skills app 节点由菜单管理页/部署方建好后再跑本迁移）。

insert into public.menus
  (pid, permission, name, component, uri, type, sort, hidden, scopes)
select
  s.id,
  'skills:skill:create',
  '上传 Skill',
  null,
  null,
  'button',
  1,
  false,
  '{A}'
from public.menus s
where s.component = 'skills'
  and s.type = 'app'
  and not exists (
    select 1 from public.menus m where m.permission = 'skills:skill:create'
  );

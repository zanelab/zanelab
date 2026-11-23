-- 0008: 补种 skills 更新/删除按钮权限节点（skills:skill:update / skills:skill:delete）
--
-- 0006 只种了 skills:skill:create（上传入口）；11-23-skills-crud-mock 给技能
-- 加了编辑/删除操作，前端 <Permission code> 需要对应按钮节点（flattenPermissions
-- 从菜单树提取）。
-- 序号注意：0007 已被 menu_i18n_key 占用（11-22 任务）——本文件不得改回 0007，
-- 否则版本前缀冲突会让 supabase migration up 在已应用 0007 的环境静默跳过。
--
-- 注意：RBAC 的菜单树/按钮节点是 iam 域——本迁移在 iam 项目（apps/iam-web/
-- supabase/migrations/）；skills 表与 skills Edge Fn 在 skills-web 自己的
-- Supabase 项目（2026-11-23 结构修正），鉴权时 skills fn 读 supabaseAdmin
-- 所指项目的 role_permissions（部署在同一项目时即通）。
--
-- 幂等：**不复用** 0004 的「menus 非空即跳过」守卫（库此时非空）——改为
-- 「不存在对应 permission 行才插入」，可重复执行。
-- 父节点：component='skills' 的 app 节点；不存在则 SELECT 无行、整体零插入
-- （不硬造父节点，与 0006 同款守卫）。

insert into public.menus
  (pid, permission, name, component, uri, type, sort, hidden, scopes)
select
  s.id, 'skills:skill:update', '编辑 Skill', null, null, 'button', 2, false, '{A}'
from public.menus s
where s.component = 'skills'
  and s.type = 'app'
  and not exists (
    select 1 from public.menus m where m.permission = 'skills:skill:update'
  );

insert into public.menus
  (pid, permission, name, component, uri, type, sort, hidden, scopes)
select
  s.id, 'skills:skill:delete', '删除 Skill', null, null, 'button', 3, false, '{A}'
from public.menus s
where s.component = 'skills'
  and s.type = 'app'
  and not exists (
    select 1 from public.menus m where m.permission = 'skills:skill:delete'
  );

-- 0007: menus 表加 i18n_key 列（菜单多语言翻译键）+ 回填 seed 导航节点
--
-- 背景：菜单文案此前只有单语言 name 列。宿主 portal-web 已有 i18nKey 渲染期
-- 解析机制（menuTitle() 三态：无 key → 用 name；有 key 缺条目 → defaultValue 回退
-- name；有 key 且命中 → 翻译），但接口从未下发该键 → 第三态永远走不到。
-- 本迁移补齐存储侧：name 保持 not null 作为回退原文，i18n_key 可空（空 = 不配）。
--
-- 幂等：add column if not exists；回填带 `and i18n_key is null` 守卫
-- （不覆盖 admin 已配的值，可重复执行）。

alter table public.menus
  add column if not exists i18n_key text;

-- 回填 seed 的 5 个导航节点。
-- 按 permission / uri / component 定位——name 可能被 admin 改过，不是稳定标识。
-- button 节点是权限码载体、其 name 只在管理页与权限码提示里出现，不进宿主导航
-- 文案，故不回填。
--
-- 定位条件同时带上 type/permission，避免命中同 uri 或同 component 的其它节点
-- （admin 后续新建的节点可能复用这些值——回填只应作用于 seed 节点）。
update public.menus set i18n_key = 'menus.home'
  where uri = '/home' and type = 'menu' and permission is null and i18n_key is null;

update public.menus set i18n_key = 'menus.system.title'
  where component = 'iam' and type = 'app' and uri = '/iam' and i18n_key is null;

update public.menus set i18n_key = 'menus.system.users'
  where permission = 'system:user:list' and type = 'menu' and i18n_key is null;

update public.menus set i18n_key = 'menus.system.menus'
  where permission = 'system:menu:list' and type = 'menu' and i18n_key is null;

update public.menus set i18n_key = 'menus.system.roles'
  where permission = 'system:role:list' and type = 'menu' and i18n_key is null;

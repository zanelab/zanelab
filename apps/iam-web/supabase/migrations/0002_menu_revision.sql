-- 0002: 菜单表结构精简 + 动态表单字段（任务 11-04）
-- =====================================================================
-- 设计：.trellis/tasks/11-04-menu-revision/prd.md（用户评审意见修订 11-03）
--
-- 变更清单：
-- 1. 删 menu_type：与 type 重复（旧 RawMenuItem 契约历史遗留）
-- 2. 删 parent：旧树冗余字符串（父节点 code），pid 外键已唯一承载树形关系；
--    宿主消费端（portal api/menu.ts、router、stores）零使用该字段（已验证）
-- 3. 增 active_icon：激活态菜单图标（icon 旁；app/menu 类型下使用）
-- 4. scopes 语义改为「适用范围」：A=管理端 / C=客户端（多选）；
--    CHECK 值域改 A/C；游客可见规则同步 = scopes 含 C（Edge Fn 侧改）
-- 5. 种子数据 scopes ['O'] → ['C']（首页/系统管理为客户端可见）
--
-- 幂等性：db reset 重放 0001→0002 顺序执行（全新库不炸）；
-- 破坏性变更（drop 列）：云上已执行 0001 且有数据时先确认再部署。

-- ==================== 删列 ====================

alter table public.menus drop column if exists menu_type;
alter table public.menus drop column if exists parent;

-- ==================== 增列 ====================

-- 激活态菜单图标（app/menu 类型；icon 旁成对使用）
alter table public.menus add column if not exists active_icon text;

-- ==================== scopes 值域改 A/C ====================

-- 旧 CHECK 引用 O 值域（0001 未建显式 CHECK，type 有 check 而 scopes 无——
-- 此处补上 A/C 值域约束；已有行先搬运，再挂约束）
update public.menus set scopes = '{C}' where scopes @> '{O}';

alter table public.menus drop constraint if exists chk_menus_scopes;
alter table public.menus
  add constraint chk_menus_scopes
  check (scopes <@ array['A', 'C']::text[] and array_length(scopes, 1) >= 1);

-- ==================== 种子回填（0001 的 scopes 搬运后此步为幂等兜底） ====================

update public.menus set scopes = '{C}'
where code in ('home', 'iam', 'users', 'menus', 'roles') and scopes = '{}';

comment on table public.menus is
  '菜单树（任务 11-04 修订）：pid 单源承载树形关系；scopes 为适用范围 A=管理端/C=客户端（含 C 即游客可见）';

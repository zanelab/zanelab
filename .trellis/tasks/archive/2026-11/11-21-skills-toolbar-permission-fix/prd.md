# skills 市场工具栏胶囊样式统一 + admin 权限链路修复

## Goal

修复用户在 :5173/skills 实测发现的两个问题：
1. 工具栏（筛选 / 搜索 / 分类触发器）样式与 SortTabs 胶囊不一致；
2. admin 账号看不到「上传 skills」入口（Permission 判定不放行）。

## Background / Confirmed facts（2026-11-21 浏览器 + DB 实测）

- **F1 · 样式现状**：筛选按钮与分类触发器用 daisyUI `btn btn-outline btn-sm`
  （marketplace.tsx:100/116、category-menu.tsx:192）；搜索框外层 `input input-sm`
  （search-input.tsx:23）；SortTabs 是自拼胶囊（sort-tabs.tsx:20：rounded-full
  + border-base-300 + bg-base-100 + p-1 容器，h-8 项）。四者同排但形态不一。
- **F2 · admin 无上传入口的证据链**：
  - 登录后 `/auth/roles/1/permissions` = `["*"]`（admin 角色确实持通配）；
  - `/auth/menus`（登录态）返回的 skills 节点 children=null——**数据库 menus 表
    没有 skills:skill:create 按钮节点**（0004 种子只种 system 域按钮码）；
  - portal 前端 permissions 唯一来源 = `flattenPermissions(menus)`（menu-store.ts:42）；
    `mergePermissions`（menu-store.ts:44）**无任何生产消费方**（仅测试调用）；
    `role_permissions` 的 `*` 从不进入前端权限数组；
  - skills-web `hasPermission('skills:skill:create')`：数组无该码无 `*` → 不放行。
- **F3 · 设计缺口**：后端 `requirePermission` 用 role_permissions（admin '*' 全通），
  前端显隐只看菜单树——两套数据源不对齐。admin 前端权限完全依赖菜单树里有对应
  button 节点，与「admin 即通配」的后端语义相悖。
- **F4 · Edge Fn 已有角色权限端点**：`GET /auth/roles/:id/permissions` 返回角色
  权限码（rolesGetPermissions，admin-only 场景下已验证可用），但它面向「角色管理
  页」；**没有「当前用户的权限码并集」端点**（userPermissions() 是内部函数，
  user 的角色→权限并集无 REST 出口）。
- **F5 · 用户已确认方向**：B 案（登录后合并角色权限码到前端）+ 补种 skills 按钮
  节点，两个都做；样式问题同任务顺手修。

## Requirements

- **R1（样式）**：工具栏四控件视觉统一为 SortTabs 胶囊形：筛选按钮（小屏 +
  桌面收起态两个实例）、搜索框外层、分类触发器——`h-8`、`rounded-full`、
  `border-base-300`、`bg-base-100`、同字号字重（text-[13px] font-semibold）；
  交互态（hover/焦点环/禁用）保留且风格协调；不改动 SortTabs 本身。
- **R2（数据）**：补种 skills 按钮权限节点：migration 新增（幂等，参照 0004
  风格）：skills app 节点下 `skills:skill:create`（名称「上传 Skill」，type=button）。
  0004 的幂等守卫是「menus 非空即跳过」——新 migration 不能复用该守卫（库非空），
  按「不存在 permission='skills:skill:create' 行才插入」幂等。
- **R3（链路·前端权限并集）**：登录后前端的 permissions = 菜单派生码 ∪
  当前用户角色权限码并集：
  - Edge Fn 新增「当前用户权限码」出口（GET /auth/permissions 或
    /auth/me/permissions，命名实现时定）：resolveUser → userPermissions() →
    `{ permissions: string[] }`（admin 即 ['*']）；匿名 401。
  - portal bootstrapSession / restoreSession 在 setMenus 后并行拉该端点 →
    `useMenuStore.mergePermissions(codes)`；失败不阻塞（console.warn，菜单派生
    码兜底）。
  - api 层按 http-api-guidelines 加端点常量 + fetch 函数（fetchMyPermissions）。
- **R4（语义对齐）**：'*' 进入前端 permissions 后，skills-web/iam-web 的
  hasPermission `includes('*')` 分支自然放行——两个子应用无需改动；
  portal 自身 RouteGuard 的 permission 校验同样受益（admin 不再误判 403）。
- **R5（不回归）**：匿名菜单、guest 角色、菜单管理页全量树、iam 子应用按钮
  级权限（system:* 码）行为不变。

## Out of scope

- 不改 skills-web 组件判定逻辑（'*' 语义已存在）。
- 不做菜单管理页 UI 增强（节点由 migration 种入即可）。
- 不处理「页面停留期间 token 过期的主动探测」（另一话题）。

## Acceptance Criteria

- [ ] AC1：浏览器实测 :5173/skills——筛选/搜索/分类与排序胶囊同高同形
      （rounded-full、同边框同底色），截图核对。
- [ ] AC2：admin 登录 → /skills 出现「上传 skills」入口；点击打开占位对话框。
- [ ] AC3：guest/匿名登录 → 上传入口不出现；system:* 按钮码行为不回归。
- [ ] AC4：新增端点有测试（匿名 401 / 登录返回角色权限并集）；
      portal 合并链路有测试（成功合并 / 失败不阻塞）。
- [ ] AC5：portal + iam + skills 三 app tsc/test/build 全绿；migration 可重复执行。

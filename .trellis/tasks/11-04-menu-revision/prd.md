# 菜单管理修订: 表结构精简 + 动态表单（类型联动）

## Goal

11-03 落地的菜单管理（第一版）按用户评审意见修订：

1. **表结构**：`menus` 表的 `menu_type`（与 `type` 重复）删除；`icon` 下新增 `active_icon`
   （激活态菜单图标）；`scopes` 语义改为「适用范围」多选 **A=管理端 / C=客户端**（多选必填），
   游客可见规则同步改为 **scopes 含 C**（客户端可见 = 游客可见）；`parent`（旧树冗余字符串，
   宿主消费端零使用——已验证）删除，**树形关系由 `pid` 唯一承载**；新增 `hidden` 表单开关
   （第一版表单缺失，字段已在表中）。
2. **界面**：新建/编辑弹窗重构为**菜单类型驱动的动态联动表单**（应用/分组/菜单/按钮四类，
   字段显隐按矩阵变化），替代第一版的静态平铺表单。

## Background / Confirmed facts

- **F1 · 现状**：`0001_rbac_init.sql` 的 `menus` 表 13 字段；`MenuManagementPage.tsx` 静态表单
  （name/code/uri/type/sort/hidden 七字段）；Edge Fn 菜单端点已含游客规则
  （`hidden=false + scopes 含 O`）与 CRUD。
- **F2 · pid vs parent**（用户要求"看看关系"）：旧契约里 `parent` 是**父节点 code 的字符串**
  （冗余——pid 已是外键）；已验证宿主消费端（portal `api/menu.ts`、router、stores）**零使用**
  `parent` 字段。删除安全，树形关系单源化到 `pid`。
- **F3 · 用户确认的语义**：
  - **scopes 改 A/C 多选必填**（管理端 A / 客户端 C），游客可见规则改为 **scopes 含 C**；
  - **hidden 回归表单**（新增表单项）；
  - 动态字段矩阵（用户提示词第二版，以此为准）：
    | type | 父级菜单 | component | uri | icon/active_icon |
    |---|---|---|---|---|
    | app | 可为根 | 选填（应用名，例 home） | **必填**（应用路由） | 选填/选填 |
    | group | **必填** | — | — | — |
    | menu | **必填** | 选填 | **必填**（组件路由） | 选填/选填 |
    | button | **必填** | — | — | — |
  - 全局字段：菜单类型（默认应用）、菜单名称（必填，占位"菜单资源的唯一标识"）、
    **适用范围 scopes（必填多选，占位"请选择适用范围"）**、排序编号（必填，"权重数值越小
    显示越靠前"）、菜单图标 + 激活图标（app/menu 类型下的选填动态字段）、组件名称
    （app/menu 类型下的选填动态字段）。
  - 与第一版需求（11-03 被删的 menu-redesign）的差异：无「访问URL 多值」「资源标识 40 字上限」
    「组件名称 50 上限」——**以本 PRD 矩阵为准**（用户两次输入，后版覆盖前版）。
- **F4 · 本机无 supabase CLI**：迁移静态自查 + 用户手测（同 11-03）。
- **F5 · 测试栈现成**：16 用例需随契约同步。

## Requirements

- **R1 · 迁移 0002**：`menu_type`/`parent` 列删除；`active_icon` 列新增（icon 下）；
  `scopes` CHECK 约束改为值域 `A`/`C`；种子数据 scopes 由 `['O']` 改 `['C']`（首页/系统管理
  都是客户端可见）。
- **R2 · Edge Fn**：字段契约同步（SELECT 列、MenuRow/MenuInput、校验矩阵按 F3）；
  游客规则 `scopes @> '{C}'`；类型条件校验（服务端权威，错误码 1014）。
- **R3 · 页面动态表单**：type state 驱动条件渲染（F3 矩阵）+ hidden 开关 + scopes 多选
  （chip 形态或双 toggle）+ 必填拦截；列表页列头同步。
- **R4 · api 层**：`MenuItemRecord`/`MenuInput` 增 `activeIcon`、scopes 语义注释；类型同步。
- **R5 · mock**：内存数据 scopes 改 `['C']`、增 activeIcon；校验矩阵对齐。
- **R6 · 测试**：既有用例适配 + 类型联动用例（切类型显隐、必填拦截、1014）。
- **R7 · 文档**：README 菜单契约表更新；spec 记录 parent 删除（pid 单源）与 scopes 新语义。

## Acceptance Criteria

- **AC1** 弹窗按 F3 矩阵联动：四类型切换字段显隐正确（应用含图标双字段+组件+必填路由；
  分组仅父级；菜单全套；按钮仅父级）。
- **AC2** scopes 多选必填：A/C chip 可勾选，至少选一；落库数组。
- **AC3** hidden 开关在表单中；列表页隐藏标记展示不变。
- **AC4** 服务端条件校验：菜单缺 uri → 1014；按钮缺父级 → 1014；绕过前端直调也被拦。
- **AC5** 游客可见 = scopes 含 C：种子菜单（C）游客可见；改为 A-only 的菜单游客不可见。
- **AC6** CRUD 全绿（vitest 适配后）；两 app build/tsc/prettier 绿。
- **AC7** 迁移 0002 幂等可重放；0001 不修改。

## Out of scope

- RBAC 链路（roles/user_roles/role_permissions/触发器）；宿主侧；列表页结构重构（仅列头
  字段名同步）；访问URL 多值（用户第二版需求已移除该字段）。

## Key decisions (resolved)

- scopes = A/C 多选必填，**C = 游客可见**（用户确认）。
- hidden 回归表单（用户确认）。
- parent 删除、pid 单源（宿主零消费已验证，F2）。
- 菜单名称 = 唯一标识（占位文案按用户原文），code 列与 name 列的关系维持第一版
  （name 展示、code 唯一键）——占位文案写在 name 上，不合一（与被删的 menu-redesign 不同，
  本次用户提示词同时有 name 与 code 语义的字段仅 name 一处，维持现状改动最小）。

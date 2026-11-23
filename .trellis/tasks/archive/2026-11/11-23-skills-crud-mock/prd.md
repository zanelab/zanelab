# 子任务②：技能 CRUD（Supabase edge fn + VITE_USE_MOCK）

> 父任务：.trellis/tasks/11-22-skills-i18n-theme-crud（源需求集 + 决策 D1–D3）
> 本子任务 = 父 PRD 的 R3–R6。**文案消费依赖子任务①的 i18n 基建**（语言包 +
> useTranslation），实施顺序在子①之后；接口规划本身不依赖子①。

## Goal

技能的获取/增/删/改/查用 Supabase edge fn 实现（读公开 + 写权限码，
父任务 D1）；`VITE_USE_MOCK=true` 时走 MSW mocks 获取全部数据（行为与
真接口一致），支撑独立开发与测试。UI 走 Modal 表单（父任务 D3）。

## 接口规划（Supabase Edge Function：`functions/skills/`（skills-web 独立 Supabase 项目），部署名 `skills`）

Base path：`/functions/v1/skills`（集成态经宿主 proxy：`/skills/functions/v1/...`，
portal vite.config.ts 补代理规则剥 `/skills` 前缀）。

Envelope 与 iam edge fn 一致：`{ code, data, msg }`，code 0 = 成功；
CORS 头 + OPTIONS 交由 Supabase 网关白名单（同 iam fn 的既有约束）。

| # | Method & Path | 权限 | 用途 | 请求 | 响应 data |
|---|---|---|---|---|---|
| 1 | `GET /skills` | 匿名（公开读） | 技能列表（含游客） | query 无（服务端不分页/筛选，返回全量） | `SkillRecord[]` |
| 2 | `GET /skills/:id` | 匿名（公开读） | 单条详情（编辑表单回填用） | — | `SkillRecord` |
| 3 | `POST /skills` | `skills:skill:create` | 新建 | body = SkillInput（见下） | 新建的 `SkillRecord` |
| 4 | `PUT /skills/:id` | `skills:skill:update` | 全量更新 | body = SkillInput | 更新后的 `SkillRecord` |
| 5 | `DELETE /skills/:id` | `skills:skill:delete` | 删除 | — | `{ id }` |

**SkillRecord**（接口契约，对齐现有 `SkillItem`，DB snake_case 经 api 层归一 camelCase）：

```
id: number
title: string
free: boolean
featured: boolean
outputTypes: string[]      -- OutputType 值域（'网页'|'幻灯片'|'视频'|'图像'）
roles: string[]            -- 角色 value 数组（与 FILTER_GROUPS role 组对齐）
scenes: string[]           -- 场景 value 数组
downloads: number
bookmarks: number
rating: number             -- 1–5 整数
updated_at: string         -- ISO 日期（snake；api 层转 updatedAt）
tone: string               -- 'primary'|'secondary'|'accent'|'info'|'success'|'warning'
agents: string[]           -- Agent 缩写数组（CC/CX/AG/CU）
created_at: string
```

**SkillInput**（POST/PUT 可写字段）：title / free / featured / outputTypes /
roles / scenes / downloads / bookmarks / rating / tone / agents（updated_at 服务端
管理；PUT 全量语义 = 未传字段回落缺省，或传空数组清空——design 细化）。

**错误语义**（对齐 iam fn 约定）：

| 条件 | code | HTTP |
|---|---|---|
| 成功 | 0 | 200 |
| 请求体非法（JSON 解析失败 / 值域校验失败） | 1001 / 1014 | 400 |
| 写操作无 JWT | 1004 | 401 |
| 写操作无对应权限码 | 1011 | 403 |
| :id 不存在 | 1013 | 404 |

**鉴权实现**：复用 iam fn 的 resolveUser + userPermissions 模式
（supabaseAdmin 查 role_permissions）；权限码值域校验沿用
「menus 表 permission 列」——skills:* 按钮节点由iam 项目迁移补种
（模式同 0006：skills app 节点存在才插入，幂等）。

## Requirements

### R1 DB 迁移（apps/skills-web/supabase/migrations/）

- `0001_skills_table.sql`：`skills` 表（列集见 SkillRecord；数组列用
  text[]；RLS 开启——读策略 public select，写策略 deny 全部（写走 edge fn
  service role，与 iam menus 表同款）
- `0002_seed_skills.sql`：静态 SKILLS 12 条演示数据迁种子（幂等：表非空跳过）
- `0003_seed_skills_buttons.sql`：补种 skills:skill:update / delete 按钮节点
  （create 已在 0006）

### R2 edge fn（apps/skills-web/supabase/functions/skills/index.ts）

- 新函数目录 `functions/skills/`（与 iam fn 同项目部署）；
  `functions/tsconfig.json` include 已覆盖
- 实现 5 个端点 + detectLang（msg 双语，模式同 iam fn）+ 类型联动校验
- 本地校验：`tsc -p supabase/functions/tsconfig.json`

### R3 skills-web api 层 + http 通道

- `src/api/endpoints.ts`：零依赖路径常量（INTEGRATION_PREFIX='/skills'、
  SKILLS_LIST_PATH 等 5 个，模式同 iam endpoints.ts）
- `src/api/prefix.ts`：apiPrefix 派生（props.apiPrefix 优先 → basename 回退），
  平移 iam 实现
- `src/utils/http.ts`：RequestClient 组装（集成态 props.http 透传 /
  独立态自建 + 最小拦截器，iam 同款）；`SkillsProps` 加 `http?`
- `src/api/skills.ts`：skillsApi 域对象（list/get/create/update/remove，
  snake→camel 归一 + 错误归一 Error(msg)，iam menus.ts 同款）

### R4 mocks（VITE_USE_MOCK）

- `src/mocks/skill-handlers.ts`：5 个端点的 MSW handlers，内存态种子数据
  （与 0002 种子同源），权限语义模拟（无 Authorization → 读 200 / 写 403；
  带权限码的 token → 写放行）——iam menu-handlers 同款
- `src/mocks/browser.ts` + `src/mocks/server.ts`（vitest 用）
- main.tsx / App 入口：`import.meta.env.DEV && VITE_USE_MOCK === 'true'` 时
  启动 worker（iam 同款；生产构建恒不启用）
- `.env.example`：VITE_USE_MOCK / VITE_PROXY_TARGET / VITE_API_KEY /
  VITE_ICON_PACK_URL（注释对齐 iam-web）

### R5 页面接线（Modal 表单，父任务 D3）

- marketplace.tsx：列表数据改 `skillsApi.list()`（useState + useEffect 拉取，
  加载态 spinner / 错误态重试）；筛选/排序/搜索仍走纯前端 filters.ts
- `modal/upload-placeholder.tsx` 改造为新建/编辑表单弹窗：
  - 字段：title / free / featured / outputTypes（多选）/ roles / scenes /
    agents / rating / tone——表单控件用 daisyUI（checkbox/select/input）
  - 提交 → skillsApi.create / update；成功关弹窗 + 重拉列表
  - 权限守卫：上传按钮已有 skills:skill:create（Permission 组件）
- 删除入口：卡片操作（或表单内）+ 确认弹窗，Permission code=skills:skill:delete；
  确认后 skillsApi.remove + 重拉
- 编辑入口：卡片操作（Permission code=skills:skill:update）→ 弹窗回填
- footer/content.ts 的统计（SKILLS.length 等）改用拉取后的列表数据

### R6 宿主代理

- portal `vite.config.ts` 补 `/skills/functions/v1` 代理规则（target 缺省
  http://localhost:8084，rewrite 剥 `/skills`——与 iam 规则同款并列）

## Out of Scope

- i18n 文案抽取与运行时（子任务①；本任务的弹窗文案直接用 t() 消费子①的语言包 key）
- 服务端筛选/排序/分页；静态资源上传
- iam-web 页面改动（仅其 supabase/ 目录下加迁移与 edge fn）

## Acceptance Criteria

- [ ] AC1：5 个端点按接口规划实现，envelope/错误码与规划一致
- [ ] AC2：GET 匿名可达；POST/PUT/DELETE 无 JWT → 401、无权限码 → 403
- [ ] AC3：迁移幂等（0001/0002/0003 可重复执行）；静态 12 条数据迁种子后页面展示一致
- [ ] AC4：`VITE_USE_MOCK=true`（dev）时 5 个接口全部走 MSW，权限语义与真接口一致；
      生产构建不启用
- [ ] AC5：独立态 :8084 + mock 可完整演示列表、新建、编辑、删除
- [ ] AC6：集成态经宿主 proxy（`/skills/functions/v1`）可达（代理规则已补）
- [ ] AC7：Modal 表单按权限码显隐（create/update/delete 三码）
- [ ] AC8：skills-web tsc / vitest / build 全绿；iam-web edge fn tsc 通过；
      mock 契约测试覆盖 5 端点

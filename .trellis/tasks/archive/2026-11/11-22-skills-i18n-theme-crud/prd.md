# skills-web 国际化 + 主题联动 + 技能 CRUD（Supabase edge fn + mock）

## Goal

三个交付物（同一宿主子应用的连续能力补齐）：

1. **i18n**：参考 iam-web 的方案给 skills-web 加国际化 —— 语言来自宿主
   `props.preferences.locale`（mount 取值 + `onHostStateChange` 订阅变更），
   市场页全部静态中文文案入 zh-CN / en-US 语言包
2. **radius 联动**：圆角受宿主 `props.preferences.theme.radius`（实际为
   `props.preferences.radius`，rem 字符串）控制，参考 iam-web 各管理页的
   `--page-radius` CSS 变量模式
3. **技能 CRUD**：技能列表获取与增删改查用 Supabase edge fn 实现；
   `VITE_USE_MOCK=true` 时走 MSW mocks（iam-web 同款机制），支撑独立开发与测试

## Background（已确认的仓库事实）

**宿主 props 契约（已就绪，无需改宿主）：**

- `apps/portal-web/src/micro/register.ts:176` —— props 已含 getter 形态的
  `locale`、`preferences`（SubAppPreferences：mode/colorPrimary/radius/fontSize/
  colorGrayMode/colorWeakMode/locale）、`getHostState`、`onHostStateChange`、
  `i18n: { packUrls }`；运行期变更经 onHostStateChange 推送新快照
- skills-web 的 `SkillsProps`（src/props.ts）目前只声明 container/setHasRender/
  permissions/basename —— **preferences / onHostStateChange 未声明**，需扩展类型

**iam-web 可参考的现成模式：**

- i18n 运行时：`apps/iam-web/src/locales/i18n.ts` —— 语言来源 =
  props.preferences.locale（mount）+ onHostStateChange 订阅（运行期）；
  normalizeLocale 归一（@zanelab/utils）；packUrls 懒加载；qiankun 沙箱下
  独立 i18next 实例
- main.tsx 接线：`apps/iam-web/src/main.tsx:31-38` —— mount 里 setupI18n
  + 订阅，unmount 取消订阅
- radius 消费：`apps/iam-web/src/pages/MenuManagementPage.tsx:113-123,500`
  —— `prefs.radius` → 根 div 内联 `--page-radius: <n>rem` → `rounded-(--page-radius)`
- mock 机制：`apps/iam-web/src/mocks/`（msw handlers 按 api 域分文件）+
  `.env.example` 的 `VITE_USE_MOCK`（dev-only，`import.meta.env.DEV` 守卫）
- edge fn：`apps/iam-web/supabase/functions/iam/index.ts`（单文件 1429 行，
  envelope { code, data, msg }，detectLang，requirePermission 权限码矩阵）
- api 层：`apps/iam-web/src/api/`（endpoints.ts 零依赖常量 + prefix.ts
  props 派生前缀 + 域文件）

**skills-web 现状：**

- 无 locales、无 api 层、无 utils/http、无 mocks、无 supabase 目录 ——
  四套基建都要新建（均可从 iam-web 平移）
- 技能数据是静态演示数据：`src/pages/marketplace/data.ts:150` `SKILLS: SkillItem[]`
  （12 条）；消费点：marketplace.tsx（列表/计数）、footer/content.ts（统计）
- 筛选/排序/搜索是**纯前端函数**（filters.ts）—— 输入全量数组返回过滤结果
- 上传按钮是占位（modal/upload-placeholder.tsx 注释：后端尚未提供上传接口）
- 权限码已在使用：`skills:skill:create`（Permission 组件 + 0006 种子按钮节点）、
  `skills:skill:list`（测试用例中出现）
- 宿主代理：portal vite proxy 只代理了 `/iam/functions/v1` —— **`/skills/functions/v1`
  代理规则缺失**，需要补
- skills-web 端口 8084（vite.config.ts），qiankun 注册键 `skills`、activeRule `/skills`

**Supabase 项目归属（沿用既有先例）：**

- 唯一 Supabase 项目根在 `apps/iam-web/supabase/`（config.toml + migrations +
  functions/）；skills 的菜单/按钮节点已种在该项目（0004/0006）——
  技能表迁移与新 edge fn 沿用同一项目（`functions/skills/`），不另起项目

## Requirements

### R1 skills-web i18n（参考 iam-web）

- 新建 `src/locales/i18n.ts` + `zh-CN.json` / `en-US.json`（结构与 iam 同款：
  单 namespace translation，key 按业务段嵌套）
- 语言来源：mount 时 `props.preferences.locale`（未下发缺省 zh-CN）；运行期经
  `props.onHostStateChange` 订阅变更 → `setLocale()`
- `SkillsProps` 类型扩展：`preferences?` / `onHostStateChange?`（getter 语义不变）
- 市场页全部静态中文文案入包：marketplace / toolbar（分类、搜索、上传）/
  filter-sidebar / sort-tabs / skill-card / footer（overview/faq/browse）/
  modal（上传占位）—— 13 个文件有中文文案
- data.ts 的选项 label（FILTER_GROUPS 24 个 label、SORT_OPTIONS 4 个、
  AGENT_LABEL）按「模块顶层只存 value/icon，label 渲染期 t() 解析」的既有
  i18n 规范改造
- 独立运行态（无 props）：缺省 zh-CN，不崩
- 语言包两包 key 树一致（比对脚本验证）

### R2 radius 主题联动（参考 iam 管理页模式）

- `props.preferences.radius`（rem 字符串，如 '0.5'）→ 页面根 div 内联
  `--page-radius` CSS 变量 → 大圆角容器（卡片/弹层/侧栏面板等）改用
  `rounded-(--page-radius)`
- 小圆角控件（胶囊按钮 h-8 等）是否跟随由 design 决策（iam 的做法是只对
  大容器用 --page-radius，胶囊控件保持固定 rounded-full）
- 未下发 preferences（独立态）：中性缺省（iam 用 0.5）
- 运行期变更：onHostStateChange 推送的新快照携带 radius → 重渲染生效

### R3 技能 CRUD edge fn（Supabase）

- 新表 `skills`（迁移在 `apps/iam-web/supabase/migrations/`，编号顺延 0008+），
  列集对齐 SkillItem 契约（title/free/featured/outputTypes/roles/scenes/
  downloads/bookmarks/rating/updatedAt/tone/agents）+ id/created_at
- 新 edge fn `functions/skills/`（同项目部署），RESTful 契约（envelope 与
  iam fn 一致）—— 完整接口清单见 design.md
- 权限模型沿用 iam RBAC：读 = 登录或公开（待决策），写 = 权限码
  （skills:skill:create/update/delete，按钮节点迁移补种）
- 静态 SKILLS 演示数据迁为种子迁移（数据不丢，接真后端后 data.ts 只留类型）

### R4 skills-web api 层 + http 通道

- 新建 `src/api/`（endpoints.ts 零依赖常量 + prefix 派生 + skills 域文件）、
  `src/utils/http.ts`（RequestClient 组装，集成态 props.http / 独立态自建，
  iam 同款）
- SkillsProps 增加 `http?`（HostHttpClient 形状）

### R5 VITE_USE_MOCK mock 链路（iam 同款）

- 新建 `src/mocks/`（browser.ts + server.ts + skill-handlers.ts）：
  - `VITE_USE_MOCK=true`（dev-only）启动 MSW worker 拦截 skills 域接口
  - vitest 走 setupServer（server.ts），测试用例可覆写
  - handlers 契约与 edge fn 完全一致（envelope/路径/权限语义）
- skills-web `.env.example` 新建（VITE_USE_MOCK / VITE_PROXY_TARGET /
  VITE_API_KEY 等，注释对齐 iam-web）
- portal vite proxy 补 `/skills/functions/v1` 代理规则（target 缺省
  http://localhost:8084）

### R6 页面接线

- marketplace.tsx 列表数据从静态 import 改为 api 拉取（加载态/错误态处理）
- 上传占位 modal 接真创建接口（skills:skill:create 权限守卫已有）
- 编辑/删除入口：卡片或详情的操作（权限码守卫）—— UI 形态 design 定

## Key Decisions

- **D1 权限模型 = 读公开 + 写权限码**（用户决策，2026-11-22）：技能列表 GET 匿名
  可见（与当前市场页匿名可浏览一致）；增删改走权限码守卫
  （skills:skill:create / update / delete，按钮节点迁移补种，admin 持 * 自然可用）
- **D2 任务拆分 = 父 + 2 子**（用户决策，2026-11-22）：
  - 子任务① skills-i18n-radius —— i18n + radius 主题联动（纯前端）
  - 子任务② skills-crud-mock —— 技能 CRUD edge fn + api 层 + mock（跨 DB/edge fn/前端）
  - 依赖关系：子②的 UI 文案依赖子①的 i18n 基建（语言包 + t()）；子①不依赖子②。
    实施顺序：子①先行，子②随后
- **D3 CRUD UI = Modal 表单**（用户决策，2026-11-22）：复用现有
  modal/upload-placeholder.tsx 的 dialog 基建改为新建/编辑表单；删除走确认弹窗

## Out of Scope（已收敛）

- 服务端筛选/排序/分页（filters.ts 纯前端函数保留，列表接口返回全量）
- 技能缩略图等静态资源上传（tone 语义色沿用枚举，不接存储）
- iam-web 自身的改动（portal 仅补 vite proxy；按钮节点种子在 iam 项目的迁移里）

## Acceptance Criteria（草案，待细化）

- [ ] AC1：skills-web 切语言（宿主偏好面板）后市场页全部文案跟随切换；独立态缺省中文
- [ ] AC2：宿主改 radius 后 skills 页大圆角容器跟随变化；独立态用缺省值
- [ ] AC3：`GET /functions/v1/skills/skills`（或 design 定稿路径）返回技能列表
- [ ] AC4：POST/PUT/DELETE 受权限码守卫，无码 403
- [ ] AC5：`VITE_USE_MOCK=true` 时全部接口走 MSW mocks，行为与真接口一致（含权限语义）
- [ ] AC6：独立态（:8084 直开）+ mock 可完整演示列表与 CRUD
- [ ] AC7：静态 SKILLS 数据迁种子迁移，页面数据源切接口后展示与之前一致
- [ ] AC8：三个包 tsc/test/build 全绿

## Open Questions（已全部决策，无阻塞项）

- ~~Q1 写权限模型~~ → D1
- ~~Q2 任务拆分~~ → D2
- ~~Q3 编辑/删除 UI 形态~~ → D3

## Child Task Map

| 子任务 | 目录 | 交付物 | 验收边界 |
|---|---|---|---|
| ① skills-i18n-radius | .trellis/tasks/11-23-skills-i18n-radius | skills-web i18n 运行时 + 语言包 + radius 联动 | AC1 / AC2 + 该子 PRD 内的细项 |
| ② skills-crud-mock | .trellis/tasks/11-23-skills-crud-mock | skills 表迁移 + edge fn + api 层 + mocks + Modal 表单 | AC3–AC8 + 该子 PRD 内的细项 |

父任务职责：持有源需求集（本文件）、跨子集成审查（AC8 三包全绿 + 切语言/改圆角
后 CRUD UI 文案与圆角同时正确）、最终归档。父任务无直接实现工作，实现全部在子任务。

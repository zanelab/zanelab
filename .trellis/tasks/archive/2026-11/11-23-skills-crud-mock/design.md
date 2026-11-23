# Design — 子任务② 技能 CRUD（Supabase edge fn + VITE_USE_MOCK）

> 接口规划见 prd.md「接口规划」节（5 端点 + SkillRecord/SkillInput 契约 +
> 错误码矩阵），本文件不重复，只写实现设计。

## 1. 架构与边界

```
┌─ DB（apps/skills-web/supabase/，skills 独立项目）────────────────┐
│ 0001_skills_table.sql   skills 表 + RLS（读公开/写 deny） │
│ 0002_seed_skills.sql    静态 12 条演示数据迁种子          │
│ 0003_seed_skills_buttons.sql  update/delete 按钮节点补种  │
└──────────────┬──────────────────────────────────────┘
               │ service role（edge fn 内，绕 RLS）
┌──────────────▼──────────────────────────────────────┐
│ Edge Fn functions/skills/index.ts（部署名 skills）      │
│  GET /skills        匿名 → 全量列表                     │
│  GET /skills/:id    匿名 → 单条                        │
│  POST /skills       requirePermission(skills:skill:create) │
│  PUT /skills/:id    requirePermission(skills:skill:update) │
│  DELETE /skills/:id requirePermission(skills:skill:delete) │
│ envelope { code, data, msg } + detectLang（msg 双语）     │
└──────────────┬──────────────────────────────────────┘
               │ HTTP（envelope）
┌──────────────▼──────────────────────────────────────┐
│ skills-web 新增四件套（iam 平移）：                       │
│ api/endpoints.ts（零依赖）+ api/prefix.ts + utils/http.ts │
│ + api/skills.ts（snake→camel 归一 + Error(msg)）          │
│ mocks/（browser/server/skill-handlers，VITE_USE_MOCK）    │
│ 页面：marketplace 拉取 + Modal 表单（新建/编辑）+ 删除确认  │
└─────────────────────────────────────────────────────┘
```

**部署形态（2026-11-23 用户修正）**：skills-web 是**独立可部署项目**——
`apps/skills-web/supabase/` 是它自己的 Supabase 项目（migrations/ + functions/ +
config.toml），不寄宿在 iam 项目下。部署：`supabase functions deploy skills`。

**与 iam 项目的边界**：
- skills 表与 skills fn 归 skills-web 项目（本目录）
- RBAC 的角色/权限表与菜单树归 iam 项目（skills fn 的鉴权是「JWT →
  权限码」校验，supabaseAdmin key 指向谁的角色表就查谁；部署在 zanelab
  主项目时与 iam 同库即通）
- iam 项目的 skills:skill:update/delete 按钮节点补种仍走 iam 的迁移
  （菜单树/按钮权限码是 iam 的域）

**开发态请求路径**（三种，与 iam 完全同构）：

| 形态 | 路径 | 到达 |
|---|---|---|
| 独立态 + mock | `:8084/functions/v1/skills/...` | MSW worker 拦截（不落网络） |
| 独立态 + 云 | `:8084/functions/v1/skills/...` | dev server 无代理 → 404；**独立态走云需 VITE_PROXY_TARGET**？——不：skills dev server 不配 /functions/v1 代理，独立态+云 = 在 vite.config.ts 加同款代理（design §6 决策） |
| 集成态 | `:5173/skills/functions/v1/skills/...` | portal proxy 剥 /skills → 云网关或 :8084（mock worker 在页面 origin 拦截，先于 proxy） |

## 2. DB 设计

```sql
create table if not exists public.skills (
  id bigint generated always as identity primary key,
  title text not null,
  free boolean not null default false,
  featured boolean not null default false,
  output_types text[] not null default '{}',
  roles text[] not null default '{}',
  scenes text[] not null default '{}',
  downloads int not null default 0,
  bookmarks int not null default 0,
  rating int not null default 3 check (rating between 1 and 5),
  tone text not null default 'primary',
  agents text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.skills enable row level security;
create policy "skills_public_read" on public.skills for select using (true);
-- 写不给策略：service role（edge fn）绕 RLS；publishable key 直连写不出去
```

- 数组列 text[]：outputTypes/roles/scenes/agents 的值域由 edge fn 校验
  （值域清单与 data.ts 的 FILTER_GROUPS 对齐，但**服务端不做值域硬校验**——
  仅类型/必填校验，值域漂移由前端筛选自然吞掉；理由：筛选值是前端约定的
  演示语义，服务端硬绑会挡住后续加选项）
- `rating` 1–5 check 约束保留（既有注释明确 1–5 整数）
- `updated_at`：update 时 edge fn 显式 set now()

**种子（0002）**：data.ts 的 SKILLS 12 条逐条 insert；幂等守卫
「表非空即跳过」（0004 同款——admin 已建数据则不覆盖）。

**按钮节点（iam 项目迁移 0007 补种——RBAC 菜单树是 iam 的域）**：skills:skill:update / skills:skill:delete 补种，
模式同 0006（父节点 component='skills' 的 app 节点存在才插入；幂等）。

## 3. edge fn 设计（functions/skills/index.ts）

**与 iam fn 的结构对齐**（同一套骨架逐段平移）：

- `SkillRow` / `SkillInput` 接口 + `SKILL_COLUMNS` 常量
- `parseSkillInput(body, partial)`：类型归一（Number/Boolean/String/数组）+
  必填校验（title 非空）+ rating 值域 + 数组字段Array.isArray 守卫 →
  违例 throw Error('VALIDATION:<field>') → 1014
- `requirePermission(ctx, req, lang, perm)`：与 iam fn 同语义
  （resolveUser → userPermissions → 码比对；'*' 通配）——**代码级复用**：
  两函数从 iam fn 抽出？**不抽**：跨函数目录共享代码需引入共享模块或部署
  两个函数共一个 entry，两者都破坏「单文件自包含」的既有形态。skills fn
  内复制实现（约 40 行），注释标注来源（iam fn resolveUser）——
  复用思维的取舍记录在 spec（见 R 阶段 spec 更新）
- `detectLang` / `json` / `error` / CORS 处理：同上复制平移
- 路由分发：Deno.serve 内 path 匹配（iam fn 同款 endsWith/正则模式）

**值域校验决策**：input 校验只做「类型 + title 必填 + rating 1–5」；
outputTypes/roles/scenes/agents 不做值域白名单（见 §2 理由）。

## 4. skills-web api 层

**endpoints.ts**（零 import，iam 同款注释）：

```ts
export const INTEGRATION_PREFIX = '/skills';
export const SKILLS_LIST_PATH = '/functions/v1/skills/skills';
export const SKILLS_ITEM_PATH = (id: number | string) => `/functions/v1/skills/skills/${id}`;
// GET 集合 = 列表；POST 集合 = 新建；PUT/DELETE 单项 = 更新/删除
// GET /skills/:id 详情与 PUT 同路径不同 method——path 常量共用 SKILLS_ITEM_PATH
```

**prefix.ts**：平移 iam api/prefix.ts（props.apiPrefix 优先 → basename 派生；
独立态 basename '/' → ''）。

**utils/http.ts**：平移 iam src/utils/http.ts 的组装（RequestClient +
语言头 x-client-info + apikey + envelope 解包 + 401 处理）——iam 版已处理
「独立态无 props.http 自建 / 集成态透传」双形态；skills 版去掉 refresh
链路（技能接口无会话刷新语义，401 只在写操作出现 → 提示即可）？
——**保留完整链路**：平移优先，refresh 链路闲置无害且未来加登录态直接可用。
若平移中发现 iam http.ts 与 props 深耦合（token/refresh 依赖），按消费面
裁剪并在注释说明。

**api/skills.ts**：

```ts
export interface SkillRecord { id: number; title: string; /* camel 契约，见 prd */ ... }
export const skillsApi = {
  list(): Promise<SkillRecord[]>,        // GET，匿名
  get(id): Promise<SkillRecord>,         // GET 单条
  create(input: SkillInput): Promise<SkillRecord>,   // POST
  update(id, input): Promise<SkillRecord>,           // PUT
  remove(id): Promise<void>,             // DELETE
};
```

snake→camel 归一：mapRow 模式（updated_at→updatedAt / output_types→outputTypes /
created_at→createdAt）；camel 写入（SkillInput camel，fn parseSkillInput
双形态兼容？——**不兼容**：新接口无历史包袱，契约定死 camelCase 入参
（fn 解析 body.title 等驼峰字段，DB 列 snake 由 fn 内映射），与 iam fn 的
「双形态兼容」区分开并在 endpoints 注释说明）。

## 5. mocks 设计

**skill-handlers.ts**（内存态 + 权限模拟，iam menu-handlers 同款骨架）：

- 种子：模块级 `seedSkills`（与 skills-web supabase/migrations/0002 种子同源——**从 data.ts 的 SKILLS 派生**：
  import { SKILLS } from '../pages/marketplace/data'——但 data.ts 将在子①
  改造、子②把 SKILLS 迁走。顺序上子②实施时 data.ts 已只剩类型/选项 →
  mock 种子独立定义一份（注释标注与 skills-web supabase/migrations/0002 种子同源，字段值逐条对齐）
- `resolvePermissions(request)`：读 Authorization 头（mock-admin → ['*']、
  无头 → []）——iam menu-handlers 的 resolvePermissions 平移
- 5 个 handler：路径双登记（pagePaths 模式：裸路径 + INTEGRATION_PREFIX 前缀，
  覆盖独立态与集成态两种拦截时机）
- 权限语义：读恒 200；写无码 → 1011/403；写操作模拟 admin 放行
- create/update 过 parse 同款校验（title 必填等）→ 1014 语义一致

**browser.ts / server.ts**：iam 同款平移（worker / setupServer）。

**启用开关**（main.tsx 或独立入口模块）：

```ts
if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });  // bypass：非 skills 域请求放行
}
```

iam 的启动点在哪？（otp worker 由 App/main 条件启动）——实施时对齐 iam
的调用位置与守卫写法。

## 6. 宿主代理与独立态+云

- portal vite.config.ts：`'/skills/functions/v1'` 规则（target
  `proxyTarget || 'http://localhost:8084'`，rewrite 剥 `/skills`）——与 iam
  规则并列；共享同一 VITE_PROXY_TARGET 环境变量（指云时两条规则都到云网关，
  指本地时需要分端口——**决策**：沿用单变量；本地双 dev server 联调场景
  用 mock 而不是代理分流，注释说明）
- skills dev server 不加 /functions/v1 代理（独立态+mock 已覆盖开发场景；
  独立态+云 = 用集成态或在 skills vite.config.ts 补代理——留作 AC6 验证时
  按需补，design 不预做）

## 7. 页面接线

**marketplace.tsx**：

```tsx
const [skills, setSkills] = useState<SkillItem[] | null>(null); // null = 加载中
const [error, setError] = useState('');
useEffect(() => { let alive = true;
  skillsApi.list().then(rows => alive && setSkills(rows.map(toSkillItem)))
    .catch(e => alive && setError(e.message));
  return () => { alive = false; };
}, [reloadKey]);
```

- `toSkillItem(row: SkillRecord): SkillItem`：接口行 → 页面模型（updatedAt
  格式、tone 值域一致；页面模型不新增字段）
- 筛选/排序/搜索：filters.ts 纯函数签名不变，输入从 SKILLS 常量改为 state
- footer/content.ts：统计改入参（或导出函数接收 skills 数组——实施时按
  最小改动：content.ts 改为接收 skills 的工厂函数）
- 加载态：`loading loading-spinner`（daisyUI）；错误态：文案 + 重试按钮
  （文案走子①语言包——**本任务实施时子①已合入**，key 直接消费）

**Modal 表单**（upload-placeholder.tsx 改造为 skill-form-modal.tsx）：

- 状态机：`mode: 'create' | 'edit'` + 编辑时回填（skillsApi.get(id) 或列表行传入）
- 字段控件：title(text) / free+featured(toggle) / outputTypes(checkbox 组) /
  roles+scenes(checkbox 组，值域来自 FILTER_GROUPS) / agents(checkbox) /
  rating(select 1–5) / tone(select 枚举)
- 提交：create / update → 成功关弹窗 + 触发列表重拉（reloadKey++）
- 删除：卡片操作钮（Permission skills:skill:delete）→ 确认弹窗 → remove + 重拉
- 既有 openDialog/closeDialog dialog 基建保留

## 8. 测试策略

| 项 | 位置 | 断言点 |
|---|---|---|
| edge fn | 无测试基建（同 iam）——tsc + mock 契约覆盖 | — |
| api 归一 | src/api/skills.test.ts（新建，MSW server） | list/get/create/update/remove 经 mock 往返；snake→camel；403 msg 透出 |
| mock handlers | 同上（即 api 测试即 handler 契约测试） | 5 端点路径/envelope/权限语义 |
| 页面接线 | marketplace.test.tsx（扩） | 拉取渲染/加载态/错误态；表单提交后列表刷新 |
| 表单 | skill-form-modal.test.tsx（新建） | 回填/提交体/权限守卫 |
| setup | src/test/setup.ts 加 server.listen/stop | iam 同款 |

## 9. 回滚与部署顺序

- 部署顺序：迁移（0001–0003）→ edge fn deploy → 前端（无硬顺序约束——
  前端对「接口不存在」有错误态兜底）
- 回滚：前端 revert 即回静态数据（**注意**：列表接口接入后 data.ts 的
  SKILLS 常量删除——回滚需连 data.ts 一起 revert）；DB 列/表残留无害；
  edge fn 回滚 = 部署上一版

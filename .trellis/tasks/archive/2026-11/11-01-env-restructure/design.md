# Design — env 体系重构

> 事实编号（F1…F9）见 [prd.md](./prd.md)。

## 决策记录

### DD1 · env 文件角色（模板模式）

```
.env.example   入库：参数清单 + 作用注释 + 安全占位（权威说明处）
.env           本机（gitignored）：真实值；cp .env.example .env 后填写
（.env.development / .env.production 删除）
```

- 优先级链变简单：`process.env`（shell 临时覆盖）> `.env`。不再有 mode 文件插队（F2 的覆盖陷阱消失）。
- portal-web 现存 `.env` 保留原值（云地址已在其中），不迁移。
- **`.env.development` 删除后 `VITE_USE_MOCK` 失去默认 `false`**：`import.meta.env.VITE_USE_MOCK`
  变为 `undefined`，`=== 'true'` 判定为 false → 行为不变（缺省关）。`.env.example` 中注释写明
  「不填 = 关」。

### DD2 · `VITE_USE_MOCK` 统一（R4）

iam 三处消费点（`main.tsx:148,175`、README、spec 表）改名；判定形态与 portal 完全一致
（`import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true'`）。两 app 的 `.env` 相互独立，
同名不冲突（F4 已核）。

### DD3 · apikey 注入（R5，两处）

**(a) iam 独立态**（`apps/iam-web/src/utils/http.ts` 请求拦截器）：

```ts
const apiKey = import.meta.env.VITE_API_KEY as string | undefined;
if (apiKey) config.headers.set('apikey', apiKey);
```

**(b) portal dev proxy**（`apps/portal-web/vite.config.ts`）：

```ts
'/iam/functions/v1': {
  target: proxyTarget || 'http://localhost:8081',
  // http-proxy 转发时附加 apikey（云 Supabase 网关要求 publishable key）
  headers: proxyKey ? { apikey: proxyKey } : undefined,
  ...
}
```

`proxyKey = process.env.VITE_API_KEY || env.VITE_API_KEY`（与 proxyTarget 同法读取）。

**覆盖矩阵**：

| 场景 | 请求路径 | apikey 来源 |
|---|---|---|
| iam 独立态 → 本地 supabase/无鉴权 | 直落 :8081 | (a)，`.env` 配了才带 |
| iam 独立态 → 云 Supabase（`.env` 直配云地址场景为 dev 反代目标） | 经 portal proxy | (b) |
| 集成态 → 云 | :5173 `/iam/functions/v1/*` → proxy | (b) |
| 集成态 → iam dev server（回落 :8081，mock/本地联调） | 经 portal proxy | (b)（带了对本地也无害） |

> 注：集成态页面在 :5173 origin，请求经 proxy 转发——**iam 的独立态 (a) 在集成态不生效**，
> 因为那时请求根本不经过 iam 的 http 客户端（mock 拦截在 SW 层）。矩阵中 (a)(b) 各覆盖其场景，
> 无遗漏。

**安全**：publishable key 属公开凭据（F7），出现在 dev proxy 配置与浏览器请求头均可接受；
不入库靠 `.gitignore` 保证。

### DD4 · `.gitignore` 改法（R3）

```gitignore
# 密钥/本机环境（模板 .env.example 入库，真实值 copy 成 .env 不入库）
.env*
!.env.example
```

风险核对：仓库内无其他 `.env.*` 结尾文件被误伤（F1 清点后旧文件全删）；`pnpm-lock.yaml`
不受影响。

### DD5 · 文档/spec 同步点（R7）

| 文件 | 改动 |
|---|---|
| `env-config-guidelines.md` | §3 表格改为三参数 + 两 app 同名；§4 的「.env 被 .env.[mode] 覆盖」Warning 重写为「模板模式：只有 .env 一层」；Wrong/Correct 示例的文件名更新 |
| `microfrontend-guidelines.md` | iam mock 开关名、宿主代理目标表述 |
| `apps/iam-web/README.md` | mock 命令行（`VITE_IAM_USE_MOCK` → `VITE_USE_MOCK` 或直接 `.env` 配置）、curl 补 `-H "apikey: <key>"`（直连云时需要，本地 supabase start 不需要）、「前端指向云」一节改为 .env.example 流程 |
| `apps/portal-web` 根无 README | 跳过 |

### DD6 · 消费点穷举（R8 核实）

- `VITE_PROXY_TARGET` 消费点仅 `apps/portal-web/vite.config.ts:10`（`process.env || loadEnv`）。
- `VITE_USE_MOCK` / `VITE_IAM_USE_MOCK` 消费点 F4 已穷举。
- `VITE_API_KEY` 为新变量，无存量消费。
- turbo.json / CI 无 env 依赖（turbo.json 只编排 build/test/lint 任务）。

### DD7 · iam 独立态 dev proxy（R9，实施期补充）

```ts
// apps/iam-web/vite.config.ts（改为函数式以读取 mode env）
proxy: proxyTarget
  ? { '/functions/v1': { target: proxyTarget, changeOrigin: true, secure: false } }
  : undefined,
```

- **入口设计**：配置从 `defineConfig({...})` 改为 `defineConfig(({ mode }) => ({...}))` +
  `loadEnv(mode, process.cwd(), 'VITE_')`，读取方式与 portal 完全一致（`process.env` 优先）。
- **不 rewrite**：路径 `/functions/v1/iam/auth/otp/send` 原样转发，故 `VITE_PROXY_TARGET` 填
  Supabase 基址（`https://<ref>.supabase.co`）。这与 portal 侧那条形成对照（portal 请求带
  `/iam` 前缀，须剥掉）——两者在参数表里显式区分，避免后来者照抄错一半。
- **与 mock 正交**：SW 在页面 origin 层拦截，mock 开时请求到不了 proxy；两者互不干扰，
  不需要互斥判断。
- **未设 target 时 `proxy: undefined`**：行为与改动前字节等价（仍是无代理），不引入新分支。
- **apikey 的正交性**：proxy 决定「去哪」，`VITE_API_KEY` 决定「带什么凭据」。浏览器 →
  :8081 → proxy → 云；iam 的 http 拦截器在浏览器侧注入 header，随代理转发出去。终于在
  R5a 与 R9 之间形成闭环（此前 R5a 是死代码）。

## 改动边界

| 文件 | 改动 |
|---|---|
| `apps/portal-web/.env.development` `apps/portal-web/.env.production` `apps/iam-web/.env.development` | 删除 |
| `apps/portal-web/.env.example` `apps/iam-web/.env.example` | 新建（R2） |
| `.gitignore` | DD4 |
| `apps/iam-web/src/main.tsx` | 两处 `VITE_IAM_USE_MOCK` → `VITE_USE_MOCK` |
| `apps/iam-web/vite.config.ts` | 改为函数式 + `server.proxy` 转发 `/functions/v1`（DD7） |
| `apps/iam-web/src/utils/http.ts` | 请求拦截器注入 apikey（DD3a） |
| `apps/portal-web/vite.config.ts` | proxy headers 注入 apikey（DD3b） |
| spec 两个文件 + iam README | DD5 |

**不改动**：`apps/portal-web/.env`（本机）、portal `main.tsx`（已用 `VITE_USE_MOCK`）、
`supabase/**`、两 app 的 api 层。

## 验证策略

- 自动：build / test / lint 全绿（AC6）；`git check-ignore` 断言（AC1）。
- 机器（dev server 层）：设 `VITE_API_KEY` 起两 app 的 dev server，从 dev-transformed 模块与
  proxy 日志确认变量解析与头注入逻辑生效（AC3/AC4 的机械部分）。
- 手动（浏览器，AC7）：`.env` 配云地址 + key，独立态发码 200；去掉 key 得 401。
- 手动（AC5）：`cp .env.example .env` 后走一次 dev 启动确认解析值。

## 回滚

无数据、无构建产物耦合；revert 即回。注意回滚时 `.gitignore` 与 env 文件须同 revert（否则
`.env` 会被 git 跟踪）。

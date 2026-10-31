# Design — useMock 迁到 dev-only Vite 环境变量

> 事实编号（F1…F8 / D1 / D2）见 [prd.md](./prd.md)。本文件只记录技术设计与权衡。

## 决策记录

### DD1 · 采用显式 dev-only Vite 环境变量（原方案 A），否决方案 B

- **采纳**：`import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true'`。
- **理由**：仓库已有同构先例（F4，iam-web 的 `VITE_IAM_USE_MOCK`）。portal-web 保持同形，dev 开关心智模型统一。
- **方案 B（按 `!VITE_PROXY_TARGET` 推导）被证据否决**：`VITE_PROXY_TARGET` 只驱动
  `/iam/functions/v1` 一条代理（F5），不代表 portal-web 自身后端可用性。用无关变量推导开关
  会造出一个"看起来有依据、实际是巧合"的隐式规则。
- **方案 C（把字段从生产 config.js 删掉、dev 保留）不可行**：config.js 是同一份文件（F6）。

### DD2 · 命名 `VITE_USE_MOCK`

两个应用的 `.env` 相互独立、不跨界加载，无需应用前缀消歧；同文件既有变量
`VITE_PROXY_TARGET` 同样无前缀。iam-web 的 `VITE_IAM_USE_MOCK` 保持原样（R5）。

备选 `VITE_PORTAL_USE_MOCK`：与 iam-web 命名对称性更好，但与同文件 `VITE_PROXY_TARGET`
风格不一致。评审时可改，改动仅限 2 处（`.env.development` 与 `main.tsx`）。

### DD3 · 默认值取 `false`（行为等价）

`.env.development` 中显式写 `VITE_USE_MOCK=false`，与现状 `useMock: false` 完全等价（F3）。

不选默认 `true`，理由有二：(a) 本任务是重构，不应夹带行为变化；(b) 默认打开会把
"dev 接真后端"变成又一个**需要记得关**的开关——而那正是本任务要消除的易错形态（只是
换了位置）。iam-web 的默认同样是 `false`。

### DD4 · 契约收窄的消费者分析

`ApiConfigSchema` 去掉 `useMock` 是 `@zanelab/types` 公开契约的收窄。消费者清点：

- `apps/portal-web` —— 唯一读取处 `src/main.tsx:78`（F1），本任务同步修改。
- `packages/utils` —— 只 `import type { MenuRecordRaw }`，不碰 `ApiConfig`。
- `apps/iam-web` —— **不依赖 `@zanelab/types`**（无 `config.js`，自持开关）。

结论：影响面封闭在 portal-web 内。**外部部署的 `config.js` 可能仍带 `useMock` 键**——
由 F7（`z.object` 非 strict，未知键被 strip）保证不触发"校验失败 → 回退 `DEFAULT_CONFIG`"
的兜底路径。该保证是**行为契约**而非巧合，需用 AC4 的测试锁定，防止将来有人把 schema
改成 `.strict()` 时静默破坏线上部署配置。

### DD5 · 数据流变化

```
改动前：public/config.js → window.__APP_CONFIG__ → mergeConfig → AppConfigSchema → appConfig.api.useMock
改动后：import.meta.env.VITE_USE_MOCK（构建期常量，Vite 替换文本）
```

副作用：新开关在**构建期固化**，运行期不可改——这正是 "dev-only" 的正确语义，与
`VITE_PROXY_TARGET` 一致。生产构建中 `import.meta.env.DEV` 折叠为 `false`，整个分支
连同 `await import('./mocks/browser')` 一起被消除（F1），与现状等价。

不改动 `import.meta.env.DEV` 守卫：它是"生产永不启 mock"的**结构性**保证，不依赖配置正确性。

### DD6 · D2 注释重写的边界

以**仓库内可验证的事实**为准。逐条核对：

| 现有表述 | 核实结果 |
|---|---|
| `scripts/env-switch.mjs` | 不存在（`scripts/` 仅 `clean.mjs`） |
| `pnpm dev` 已串联 `env:switch` | 根 `package.json` 无 `env:switch`；`dev` = `pnpm --filter @zanelab/portal-web dev` |
| 反代 `/auth`、`/agent` | `vite.config.ts` 无此两条代理 |
| 生产由 `nginx.conf` 的 `$api_upstream` 反代 | 仓库内无 `nginx.conf`（仅 `packages/utils/src/notify.ts:7` 一处无关提及） |

处理：前三条直接删除；第四条改写成不带具体文件名与变量名的表述（"生产不读此项"），
**不**断言部署侧用什么组件。评审时若你确认部署仓确有 `nginx.conf`/`$api_upstream`，
再补回准确表述。

同时修 `apps/iam-web/.env.development:7` 的 `VITE_IAM_TARGET`（全仓无此变量），改为指向
宿主实际使用的 `VITE_PROXY_TARGET`。

### DD7 · 不触碰 iam-web 的开关行为

R5 明确排除。iam-web 的 `VITE_IAM_USE_MOCK` 在 `mount()` 与独立分支各判一次
（`apps/iam-web/src/main.tsx:148,175`）是为集成态/独立态双态服务的，有独立的存在理由，
不在本次统一命名。

## 改动边界

| 文件 | 改动 |
|---|---|
| `packages/types/src/config.ts` | 删 `ApiConfigSchema` 的 `useMock`（:53-54） |
| `apps/portal-web/public/config.js` | 删 `api.useMock`（:33） |
| `apps/portal-web/src/config/index.ts` | 删 `DEFAULT_CONFIG.api.useMock`（:41） |
| `apps/portal-web/src/main.tsx` | 启动条件改为 `VITE_USE_MOCK`，注释同步（:77-81） |
| `apps/portal-web/.env.development` | 加 `VITE_USE_MOCK=false`；按 DD6 重写注释 |
| `apps/iam-web/.env.development` | 按 DD6 修第 7 行注释 |
| `apps/portal-web/src/config/index.test.ts` | 加 AC4 的向后兼容用例 |

**不改动**：`src/mocks/**`（handler 契约属 D1，另开任务）、`vite.config.ts`、`index.html`、
`ApiConfigSchema` 的其余字段。

## 与既有 spec 的相容性

`.trellis/spec/frontend/index.md` 的核心不变式"接口地址、登录/首页/403/404 路径等一律从
运行时配置读取，不硬编码"，针对的是**部署期可变**的路由与端点。`useMock` 不具备部署期
可变性（F1：生产恒不可用），因此迁出运行时配置**不违反**该不变式。此判断需在 Phase 3
的 spec 更新中沉淀一句话，免得后来者按字面把 dev-only 开关又搬回 config.js。

**spec 漂移（超出本任务，仅记录）**：`.trellis/spec/frontend/type-safety.md` 称配置 schema
定义在 `src/types/config.ts`，实际已迁至 `packages/types/src/config.ts`；同文件未提及
`AppConfigSchema` 的"未知键 strip"行为。前者可在 Phase 3 顺手校正，后者是 DD4 依赖的契约。

## 验证策略

- **自动**：AC4 的向后兼容用例（新增）；既有 `config/index.test.ts` 全绿；AC6 的
  test / lint / build。
- **手动**：AC5。`src/main.tsx` 无单元测试（仓库现状），dev 开关分支不进单测覆盖——
  这是**已知的验证缺口**，不假装它被自动覆盖。验证方式是 dev server 启动后看
  `mockServiceWorker.js` 是否活跃（Network 面板或 console）。
- **构建产物**：AC3 直接读 `dist/config.js` 断言无 `useMock` 键。

## 回滚

无数据迁移、无运行期状态。线上部署的 `config.js` 因 DD4 的 strip 行为**无需**同步修改，
故本改动不产生"配置与代码版本必须同时上线"的耦合。回滚 = revert 提交。

# portal-web: useMock 从运行时 config 迁到 dev-only Vite 环境变量

## Goal

`api.useMock` 是只在开发态有意义的 MSW 开关，却放在 `public/config.js` —— 一份随构建产出、
由运维在生产环境加载和修改的运行时配置。这造成语义错位：生产环境里该字段恒为死字段，
schema 却在向部署者宣称"这里可以切 mock"；同时两处默认值（`public/config.js` 与
`DEFAULT_CONFIG`）需要手工同步，且 dev 下"配了真后端代理却忘关开关 → mock 抢答"是已知易错点。

目标：让 portal-web 的 mock 开关回归 dev-only 的 Vite 环境变量，与仓库中 iam-web 的既有做法
同构，把 `useMock` 从共享的 `AppConfigSchema` 中移除，并清理规划期间发现的陈旧 env 注释。

用户价值：部署期配置契约不再包含任何 dev-only 字段；开发态开关不可能被误带进生产；
portal-web 与 iam-web 的 dev 开关心智模型统一。

## Background / Confirmed facts

- **F1 · 唯一消费点且已有生产守卫**：`apps/portal-web/src/main.tsx:78` 的
  `if (import.meta.env.DEV && appConfig.api.useMock)` 是全仓唯一读取处。`import.meta.env.DEV`
  在生产构建中为常量 `false`，整个分支连同 `await import('./mocks/browser')` 一起被消除
  —— 因此本任务修的是**语义错位与读者陷阱，不是运行时事故**（生产即使有人手改
  `config.js` 打开 `useMock`，MSW 也起不来）。
- **F2 · 字段位于共享 schema**：`packages/types/src/config.ts:54` 的
  `useMock: z.boolean().default(false)`，是 `ApiConfigSchema` 的一部分，属 `@zanelab/types` 的公开契约。
- **F3 · 两处默认值需同步**：`apps/portal-web/public/config.js:33` 与
  `apps/portal-web/src/config/index.ts:41`，当前均为 `false`。
- **F4 · 仓库已有同构先例（决定性证据）**：`apps/iam-web/src/main.tsx:148` 与 `:175` 使用
  `import.meta.env.DEV && import.meta.env.VITE_IAM_USE_MOCK === 'true'`，开关值定义在
  `apps/iam-web/.env.development`（`VITE_IAM_USE_MOCK=false`）。portal-web 是仓库中唯一把
  mock 开关放进运行时配置的应用。
- **F5 · "按 `VITE_PROXY_TARGET` 推导"的方案在语义上不成立**：该变量只驱动
  `apps/portal-web/vite.config.ts:29-37` 的 `/iam/functions/v1` 一条代理；portal-web 自身的
  `/sys/auth/*` 与 `/menu/tree` **没有任何代理**。故不能用它代表"portal-web 是否有真后端"。
- **F6 · config.js 是同一份文件**：dev 与生产都由 `apps/portal-web/index.html:7` 的
  `<script src="/config.js">` 加载，构建时原样复制到 `dist/`。"只在生产删掉该字段"不可行。
- **F7 · 移除字段对脏配置安全**：`AppConfigSchema` 是普通 `z.object`（非 strict），未知键被
  strip 而非报错；`mergeConfig`（`src/config/index.ts:65`）不做校验。故线上遗留的、仍带
  `useMock` 的 `config.js` 不会触发"校验失败 → 回退 DEFAULT_CONFIG"的兜底路径。
- **F8 · 无测试耦合**：`apps/portal-web/src/config/index.test.ts` 未断言 `useMock`。
- **F9 · 契约消费者封闭**：`@zanelab/types` 的使用方为 `apps/portal-web`（唯一读 `ApiConfig` 处
  见 F1）与 `packages/utils`（仅 `import type { MenuRecordRaw }`）；`apps/iam-web` 不依赖该包。

## Requirements

- **R1** portal-web 的 MSW 启用开关改为 dev-only 的 Vite 环境变量（沿用 F4 的形态：
  `import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true'`），保留 `DEV` 守卫。
- **R2** 从 `ApiConfigSchema` 移除 `useMock`；同步从 `apps/portal-web/public/config.js` 与
  `apps/portal-web/src/config/index.ts` 的 `DEFAULT_CONFIG.api` 移除该字段。
- **R3** `apps/portal-web/.env.development` 声明该开关并注释其语义；`.env.production`
  不出现该变量。
- **R4** 向后兼容：`AppConfigSchema` 对残留的 `useMock` 键不报错、不触发回退默认配置（见 F7）。
- **R5** 不改变 iam-web 的既有开关（`VITE_IAM_USE_MOCK`）行为与命名。
- **R6 · 清理陈旧 env 注释（D2）**：改写 `apps/portal-web/.env.development` 中四处经核实为
  虚假的表述 —— 引用不存在的 `scripts/env-switch.mjs`（`scripts/` 实际仅有 `clean.mjs`）、
  并不存在的 `pnpm dev` 串联 `env:switch`（根 `package.json` 无此脚本）、`vite.config.ts` 中
  不存在的 `/auth` 与 `/agent` 反代、以及仓库内无此文件的 `nginx.conf` / `$api_upstream`；
  同时修正 `apps/iam-web/.env.development:7` 引用的 `VITE_IAM_TARGET`（全仓无此变量，宿主
  实际使用 `VITE_PROXY_TARGET`）。改写以仓库内可验证的事实为准（处理细节见 design DD6）。

## Acceptance Criteria

- **AC1** `apps/portal-web/src/main.tsx` 中不再出现 `appConfig.api.useMock`；mock 启动条件
  由 `import.meta.env.DEV` 与 `VITE_USE_MOCK` 共同决定。
- **AC2** 全仓（排除 `node_modules`、`dist`、任务工件）`grep -rn "useMock"` 在 portal-web 源码与
  `packages/types` 中无残留命中。
- **AC3** 生产构建产物中不含该字段：`pnpm --filter @zanelab/portal-web build` 后
  `apps/portal-web/dist/config.js` 的 `api` 块中无 `useMock` 键。
- **AC4** 兼容性可测：新增单元测试断言 —— 传入含 `useMock: true` 的 `window.__APP_CONFIG__` 时
  `loadConfig()` **不** `console.error`，且返回配置对象上不再带 `useMock` 键。
- **AC5** 开发态行为可验证（**手动**，因 `src/main.tsx` 无单元测试）：`.env.development` 置
  `VITE_USE_MOCK=true` 启动 dev server，MSW worker 启动；置 `false` 或删除该行则不启动。
- **AC6** 回归全绿：`pnpm --filter @zanelab/portal-web test`、`lint`、`build` 通过；
  `pnpm --filter @zanelab/iam-web build` 不受影响。
- **AC7 · D2 可验证**：`grep -rn "env-switch\|VITE_IAM_TARGET" apps` 无命中；改写后的
  `.env.development` 注释中每条陈述都能在仓库内找到对应依据（`vite.config.ts` 的代理配置、
  根 `package.json` 的 scripts）。

## Out of scope

- **D1 · portal-web MSW mock 的端点漂移与存废判断**（证据充分，另开任务）：handler 登记
  `/api/user/menus`（`apps/portal-web/src/mocks/handlers.ts:268`），而 dev 实际加载的
  `config.js` 把 `menusEndpoint` 设为 `/menu/tree`（`apps/portal-web/public/config.js:30`）；
  `DEFAULT_CONFIG` 的 `/api/user/menus` 仅在 `config.js` 缺失时生效，而 `index.html:7` 始终加载它。
  叠加 `/menu/tree` 无代理（F5）—— **当前即便把开关打开，mock 也不会匹配 menu 请求**。
  是否修正 handler 契约，取决于 portal-web 自身 mock（含 `/sys/auth/login` 链路）如今还有多少
  价值，需单独判断。
- iam-web 的 `VITE_IAM_USE_MOCK` 重命名或跨应用开关命名统一（见 R5）。
- 把 `/sys/auth/*`、`/menu/tree` 的 dev 代理补齐到 `vite.config.ts`。
- `.trellis/spec/frontend/type-safety.md` 称 schema 位于 `src/types/config.ts` 的陈述漂移
  （实际在 `packages/types/src/config.ts`）—— Phase 3 spec 更新时校正。

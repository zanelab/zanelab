# 环境变量与运行时配置

> 分层契约：哪些开关属于**部署期**（`public/config.js`），哪些属于**开发期**（`.env` + `import.meta.env`）。
> 新增、迁移、删除配置项之前必读；放错层会导致"生产配置里出现恒为死值的字段"。

## 1. Scope / Trigger

**触发本文的场景**：

- 新增/删改 `apps/portal-web/public/config.js` 的 `window.__APP_CONFIG__` 字段；
- 新增/删改 `AppConfigSchema`（`@zanelab/types` 的 `packages/types/src/config.ts`）；
- 新增/删改任一 app 的 `.env*` 变量；
- **把一个开关在"运行时配置"与"环境变量"之间迁移归属**（本文的核心场景）。

不适用：接口路径本身的增删——那仍是运行时配置，走 [HTTP 与数据请求](./http-api-guidelines.md)。

## 2. 归属判据（Decision Rule）

一句话：**这个值在生产环境有没有可能需要（由运维）修改？**

| 会 | 不会 / 生产恒无意义 |
|---|---|
| 部署期配置：`public/config.js` 的 `window.__APP_CONFIG__` + `AppConfigSchema` | 开发期 Vite env：`.env.development` + `import.meta.env` |

**为什么必须分层**：`public/config.js` 是**同一份文件**在 dev 与 prod 被加载（`index.html` 的 `<script src="/config.js">`，构建时原样复制进 `dist/`），它由运维在生产改。把 dev-only 开关放进去，等于在生产配置契约里登记一个恒为死值的字段，并向部署者宣称"这里可以切 mock"。

**已修正的反例（2026-10-31）**：`api.useMock` 曾在 `config.js` 与 `DEFAULT_CONFIG` 两处维护，但它的唯一消费点是 `main.tsx` 的 `import.meta.env.DEV && appConfig.api.useMock` —— 生产恒为 `false`。现迁为 `VITE_USE_MOCK`（与 iam-web 既有形态一致）。

## 3. Signatures

**部署期**：

```ts
// apps/portal-web/public/config.js —— 运维可改
window.__APP_CONFIG__?: Partial<AppConfig>;

// apps/portal-web/src/config/index.ts
loadConfig(): AppConfig;          // 合并默认 → zod 校验 → 失败回退，加载一次
export const appConfig: AppConfig;
export const DEFAULT_CONFIG: AppConfig;  // 与 public/config.js 保持一致的兜底
```

**开发期**（键名必须 `VITE_` 前缀才会注入客户端；各 app 的 `.env` 相互独立、互不加载）：

| 变量 | 声明文件 | 默认 | 生效范围 |
|---|---|---|---|
| `VITE_PROXY_TARGET` | `apps/portal-web/.env.development` | 空 | dev server 代理 `/iam/functions/v1` 的目标；留空回落到 `http://localhost:8081`（iam dev server）。生产不读此项 |
| `VITE_USE_MOCK` | `apps/portal-web/.env.development` | `false` | dev 是否启动基座自身 MSW worker |
| `VITE_IAM_USE_MOCK` | `apps/iam-web/.env.development` | `false` | dev 是否启动 iam 自身 MSW worker（集成态与独立态各判一次，见 [微前端与子应用](./microfrontend-guidelines.md)） |

**消费形态统一为**（`DEV` 守卫不可省，见 §4）：

```ts
if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}
```

## 4. Validation & Error Matrix

**config.js 侧**（`loadConfig`）：

| 条件 | 行为 |
|---|---|
| `window.__APP_CONFIG__` 缺失 | 返回 `DEFAULT_CONFIG` 的副本（不报错） |
| 必填键缺失（如 `api.loginEndpoint`） | **整块** schema 校验失败 → `console.error` + 整体回退 `DEFAULT_CONFIG`（含 `microApps` 全空——菜单与子应用注册一起消失） |
| 出现 schema 中不存在的键（如已移除的 `api.useMock`） | **strip，不报错、不回退**（普通 `z.object`，非 `.strict()`）。线上遗留的旧 `config.js` 因此仍可加载 |
| 值类型/枚举非法（如 `layout.theme: 'purple'`） | `console.error` 一次 + 回退 `DEFAULT_CONFIG`，不抛异常 |

**env 侧**：

| 条件 | 行为 |
|---|---|
| 变量未声明 | `import.meta.env.X === undefined`，`=== 'true'` 为 false → 开关关 |
| 变量误写进 `.env.production` | 仍不生效：`DEV` 构建期为 false，整个分支被消除 |
| `.env` 与 `.env.[mode]` 声明同名键 | 后者胜（mode 文件后加载） |

> **Warning：`import.meta.env.DEV` 是构建期常量，由 `NODE_ENV` 推导，与 `--mode` 无关。**
> `vite build --mode development` 仍把 `DEV` 折成 `false`（2026-10-31 实测：即便 `VITE_USE_MOCK=true`，产物中无 MSW 代码，chunk 哈希与生产构建一致）。
> 两个后果：(a) 不能用 `--mode` 区分 dev/prod 行为；(b) 这正是"生产永不启 mock"的**结构性**保证——不依赖任何配置项写对。

> **Warning：`.env` 会被 `.env.[mode]` 覆盖，别把 dev 想用的值只写在 `.env` 里。**
> 同名键在 dev 下被 `.env.development` 覆盖（后者后加载），`.env` 的值只在 production mode 才生效。
> 临时指向真后端请用 shell 变量：`VITE_PROXY_TARGET=http://xxx pnpm dev`（`vite.config.ts` 中 `process.env` 优先于 env 文件）。

## 5. Good / Base / Bad

- **Good**：开关只在开发期有意义 → 声明在 `.env.development`，消费处带 `import.meta.env.DEV` 守卫，并在注释里写清"生产不读此项"。
- **Base**：接口端点、`microApps` 注册、`layout.theme`、登录页 UI 开关等**部署期可调**项 → 留在 `config.js`，并同步补进 `AppConfigSchema`。
- **Bad**：把 dev-only 开关放进 `config.js`；或虽放在 `.env` 却省掉 `DEV` 守卫（等于把生产开关交给构建环境）。

## 6. Tests Required（断言点）

`apps/portal-web/src/config/index.test.ts` 覆盖 `loadConfig` 的四类边界，逐条对应 §4 的矩阵行：

| 断言点 | 保护的契约 |
|---|---|
| 无 `window.__APP_CONFIG__` → 返回默认配置副本（且非同一引用） | 兜底可用 |
| 部分配置 → 深合并（缺省键保留默认） | 增量配置可用 |
| 非法值 → `console.error` 恰一次 + 回退默认 | 不卡死应用 |
| **未知键（`api.useMock: true`）→ 不报错、不回退、返回值上无该键** | **部署兼容**：线上旧 `config.js` 仍能加载；防止将来有人把 `AppConfigSchema` 改成 `.strict()` 时静默让线上配置整体回退 |

> 最后一条的判别条件是 `console.error` **未被调用**——因为回退同样会得到 `DEFAULT_CONFIG`，单看返回值区分不出 strip 与回退。

**已知缺口**：`apps/portal-web/src/main.tsx` 的 `import.meta.env` 分支**无单元测试**（该分支只在 dev server 下可验）。改动开关后需手动验证：置 `true` 启动 dev server 确认 worker 激活，置 `false` 确认未激活。

## 7. Wrong vs Correct

#### Wrong

```js
// apps/portal-web/public/config.js —— 随构建进 dist，由运维在生产改
window.__APP_CONFIG__ = {
  api: { /* … */, useMock: false },
};
```

```ts
// apps/portal-web/src/main.tsx
if (import.meta.env.DEV && appConfig.api.useMock) { /* … */ }
```

问题：字段同时维护在 `config.js` 与 `DEFAULT_CONFIG` 两处；生产环境该字段恒为死值，但 schema 仍在向部署者暴露它；dev 下"配了真后端却忘关开关 → mock 抢答"是个裸奔的易错点。

#### Correct

```bash
# apps/portal-web/.env.development
# VITE_USE_MOCK：dev-only 的 MSW 开关。生产构建 DEV 为 false，本项在生产不会被读取。
VITE_USE_MOCK=false
```

```ts
// apps/portal-web/src/main.tsx
if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') { /* … */ }
```

字段不再出现在部署期契约里；dev-only 由**构造**保证（构建期常量 + `DEV` 守卫），不靠配置写对。

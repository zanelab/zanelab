# 类型安全

> TypeScript 全程使用；运行时配置的类型用 **zod schema 推导**，而不是手写 interface。跨模块共享类型集中在 `src/types/`。状态类型随状态边界走：auth/menu 的 store 类型在 `src/stores/auth-store.ts`、`menu-store.ts`，壳 store 的类型留在各自 `src/stores/*-store.ts` 内部不对外导出——业务代码不 import 壳状态类型（design §2）。

## 配置类型：zod 先行

`public/config.js` 的运行时配置是「不可信运行时输入」，必须校验。做法（§3.1）：

1. 在 `packages/types/src/config.ts`（`@zanelab/types`）定义各级 schema（`System/Auth/Api/Route/Layout/MicroAppConfigSchema`），再组合出 `AppConfigSchema`。壳内 `apps/portal-web/src/types/` 只是 re-export shim。
2. 用 `z.infer<typeof AppConfigSchema>` 导出 `AppConfig` 类型——**不要**另写一份 interface，避免两处定义漂移。

```ts
export type AppConfig = z.infer<typeof AppConfigSchema>;
```

3. `src/config/index.ts` 的 `loadConfig()`：合并默认配置 → `AppConfigSchema.safeParse` → 失败 `console.error` 并回退默认配置（§3.1）。校验失败不允许直接抛异常卡死应用。
4. `layout.theme` 是 **daisyUI 主题名**（默认 `dark`/`light`，取决于 CSS 插件启用的主题集），运行时映射到 `<html data-theme="…">`，不是任意自定义对象。新增主题时先在 daisyUI 插件里启用，再同步 schema 的可取值。
5. schema 是**普通 `z.object`（非 `.strict()`）**：未知键被 **strip** 而非报错。这是**部署兼容契约**——线上已部署的 `config.js` 可能仍带已移除的旧键（如 `api.useMock`），必须仍能加载，不能因此触发「校验失败 → 回退 `DEFAULT_CONFIG`」（那会让线上菜单与子应用注册一起清空）。改 schema 时**不要**顺手加 `.strict()`；该行为由 `apps/portal-web/src/config/index.test.ts` 锁住。字段归属（部署期 vs 开发期）见 [环境变量与运行时配置](./env-config-guidelines.md)。

## 菜单类型

`MenuItem` 是菜单接口返回的业务结构，贯穿 store / 路由 / 组件。字段以 `docs/技术方案.md` §4.3 为准：

```ts
interface MenuItem {
  id: number;
  name: string;        // 菜单名（展示用，含中文）
  icon?: string;
  path: string;
  appName?: string;    // 'portal' / 缺省 = 本地页面；否则 = 子应用注册键
  permission?: string; // 权限码，如 'system:user:list'
  children?: MenuItem[];
}
```

`appName` 是关联子应用注册中心的唯一键（§4.1），别改成别的字段名或凭空多造一个关联键。

## window 全局类型扩展

主应用把共享 http 实例挂到 `window.__http`（只读代理，见 [HTTP 与数据请求](./http-api-guidelines.md)），需用 `declare global` 声明，而不是到处 `(window as any)`：

```ts
declare global {
  interface Window { __http: typeof httpProxy; }
}
window.__http = httpProxy;
```

## `any` 的使用边界

跨 qiankun / window 边界，方案示例里有 `(window as any)`（§9.1）。**只有这些真·边界允许放宽**，做法：

- 为共享接口（菜单接口、`window.__APP_CONFIG__`、子应用 props）补共享类型，边界之后立刻落回类型。
- 子应用 `mount(props)` 的 props 若主应用侧没类型，先为它定义契约类型再使用，不要贯穿式 `any`。

## 接口请求的返回

走统一 http 实例后，业务层拿到的是解包后的 `data`（拦截器已消费 `{ code, data, msg }`，见 [HTTP 与数据请求](./http-api-guidelines.md)）。接口函数（`src/api/menu.ts` 等）给返回类型标注上对应实体类型。

## 反面模式

- 手写 `interface AppConfig` 与 zod schema 双份维护。
- 全代码 `as any` 传导（尤其从 `window.__APP_CONFIG__` / http 返回流出来之后）。
- 菜单类型里把 `appName` 改叫别的、或允许任意新关联键而不同步配置中心。

# HTTP 与数据请求

> 本项目所有接口请求都走 `src/utils/http.ts` 的**统一 Axios 实例**。业务代码不要自建 `axios.create()`，不要重复写拦截器。

## 实例与拦截器（§8.1、§5.2）

`service = axios.create({ baseURL: appConfig.api.baseURL, timeout: 10000 })`。

**请求拦截器**：从 store 读 token，有则加 `Authorization: Bearer <token>`（不要从 localStorage 现读，store 才是权威）。

**响应拦截器**，两层：

1. 成功分支解包业务体：响应为 `{ code, data, msg }`。
   - `code === 0` → 直接返回 `data`（业务层拿到的是解包后的数据，别再 `.data`）。
   - `code !== 0` → 用 `bizErrorMessages[code] || msg || '请求失败'` 提示并 reject。
2. 失败分支按 HTTP 状态处理：
   - 无 `error.response`（断网）→ 提示「网络连接异常」
   - `401` → 走刷新流程（见下）
   - `403` → 提示「无权限访问」（可跳 403 页）
   - `>= 500` → 提示「服务器错误，请稍后重试」

业务错误码统一放映射表（§8.1），例如：

```ts
const bizErrorMessages: Record<number, string> = {
  10001: '用户名或密码错误',
  10002: '账号已禁用',
  // ...
};
```

## 错误/成功提示：daisyUI `alert` + `toast`（替代 antd `message`）

拦截器不能直接渲染 React，用一层薄的「notify」帮助模块把消息交给根组件的 toast 区显示：

- `src/utils/notify.ts`：模块级发布/订阅，暴露 `notify.error(msg)` / `notify.success(msg)` / `notify.warning(msg)` / `notify.info(msg)`。
- `src/components/ToastRegion.tsx`：在根组件挂载一次，订阅 notify 并渲染 `.toast` 容器，每条消息是一个 daisyUI `alert`：

```tsx
<div className="toast toast-end">
  <div role="alert" className="alert alert-error">…</div>
</div>
```

- 类名按 daisyui `alert` / `toast` 组件指南；不同级别用 `alert-success/alert-warning/alert-error/alert-info`，自动消失由 ToastRegion 控制。
- 成功提示等低频反馈也走 notify，不散落自建弹窗。

**因此：业务代码与拦截器里没有 `message.error(...)` 之类的 UI 库调用，一律 `notify.error(msg)`。**

## 401 单飞刷新（§5.2）

并发请求同时 401 时只刷新一次，其余排队等新 token 后重放。核心是模块级锁 + 订阅者队列：

- `isRefreshing` 标志 + `refreshSubscribers: ((token) => void)[]`。
- 首个 401（且 `!originalRequest._retry`）置 `_retry`，发起刷新：`POST {refreshEndpoint}` 带 `refreshToken`。
- 成功：写 `localStorage[tokenKey]`、`store.dispatch(setToken)`，`onRefreshed(newToken)` 放行排队请求。
- 失败：`handleLogout()` 并 reject（不要静默吞掉）。
- 排队请求：`subscribeTokenRefresh` 后重发原请求即可。

## 只读共享实例（§8.1）

主应用把实例暴露给子应用，但**禁止子应用改拦截器**——用 Proxy 挡掉 `interceptors`：

```ts
const httpProxy = new Proxy(service, {
  get(target, prop) {
    if (prop === 'interceptors') return undefined; // 只读，禁止改拦截器
    return target[prop];
  },
});
window.__http = httpProxy;
```

## 接口函数的书写（src/api/）

- 请求地址一律取 `appConfig.api.<endpoint>`（如 `menusEndpoint`），**不硬编码路径**（§10：接口路径都可在配置覆盖）。
- 共享端点：`/api/auth/login`、`logout`(可选)、`refresh`(可选)、`/api/user/info`、`/api/user/menus`（§10）。
- 函数式命名：`fetchMenus(token)`、`fetchExtraPermissions(token)`，返回类型标注实体类型（见 [类型安全](./type-safety.md)）。

## 反面模式

- 新写一个 Axios 实例 / 在子应用或组件里自建拦截器 → 401 刷新、错误码映射、错误提示全部失效。
- 硬编码 `'/api/user/menus'` 之类路径到业务代码里。
- 在拦截器里直接操作 React/组件库弹窗（用 notify 帮助模块），或把刷新失败静默掉。

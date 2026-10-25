# Hook 规范

> 项目里自定义 Hook 不多，核心是「读配置」「订阅全局状态」，不要为了抽象而造 Hook。

## 访问运行时配置：useConfig

`config.js` 的配置通过 Context 下发（§3.2），在 `main.tsx` 里 `<ConfigProvider>` 包裹 `<App/>`：

```tsx
// contexts/ConfigContext.tsx
const ConfigContext = createContext<AppConfig>(appConfig);
export const ConfigProvider = ({ children }) => (
  <ConfigContext.Provider value={appConfig}>{children}</ConfigContext.Provider>
);
export const useConfig = () => useContext(ConfigContext);
```

组件/守卫里一律用 `useConfig()` 取配置；不要直接读 `window.__APP_CONFIG__`，也不要到处 `import { appConfig }`（会绕过类型检查入口的 Context 层级）。

## 读全局状态（zustand）

- React 组件用 store hook + selector 直取字段，如 `useAuthStore(s => s.token)`、`useMenuStore(s => s.permissions)`、`useMenuStore(s => s.menus)`。
- selector 只订阅所需最小字段，别把整个 state 订阅下来引起无关重渲染；zustand 默认 `Object.is` 比较，选基础字段即可，无需 shallow 比较（§12 的性能要求）。
- 非 React 模块（http 拦截器、qiankun 注册等）用 `useXxxStore.getState()` 直读写，例：登出时 `useAuthStore.getState().logout()` / `useMenuStore.getState().clearMenus()`（见 §5.3）。

## 导航

- 组件内跳转用 `useNavigate`；`SidebarMenu` 点击菜单项 `navigate(key)`（§7.3）。
- 拿当前路径用 `useLocation`；侧边栏高亮取 `location.pathname` 作为 `selectedKeys`。

## 全局事件监听

主应用根组件要监听 `global-logout` 事件并在清理时移除（§5.3 / App.tsx）：

```tsx
useEffect(() => {
  const handleLogout = () => navigate(config.auth.loginPath, { replace: true });
  window.addEventListener('global-logout', handleLogout);
  return () => window.removeEventListener('global-logout', handleLogout);
}, []);
```

原则：在 React 里监听的全局事件（`window` / qiankun `onGlobalStateChange`）必须在 effect 的 cleanup 中移除，避免重复触发。

## 命名与放置

- 以 `use` 开头的自定义 Hook 放在 `src/hooks/`（若产生）；有 JSX 返回值的叫组件，不叫 Hook。
- 单一用途：每个 Hook 只做一件事；若某个 Hook 超过一个关注点（配置 + 请求 + 权限），拆开。
- 纯逻辑（无 Hook 依赖）放 `src/utils/`，不要伪装成 Hook。

## 反面模式

- 自建「读取配置」的新途径（全局变量、别的 Context），导致配置源分裂。
- 在 zustand selector 里返回新对象/新数组字面量造成无限重渲染。
- 忘记在 effect cleanup 里移除 `global-logout` / qiankun 全局状态监听。

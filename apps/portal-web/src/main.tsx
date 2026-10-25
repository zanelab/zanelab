import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { appConfig } from './config';
import { ThemeProvider } from './components/theme-provider';
import { ToastRegion } from '@zanelab/ui';
import { App } from './App';
import { applyConfigPreferences } from './stores/preferences-store';
import { initIcons } from './stores/icon-store';
import {
  setupHostState,
  restoreSession,
  setupMicroApps,
  loadPublicMenus,
} from './micro/register';
// i18n 运行时副作用初始化（React 渲染前；09-09-i18n）
import './locales/i18n';
import './index.css';
import './components/menu/menu.css';
import '@zanelab/ui/scrollbar.css';

const rootEl = document.getElementById('root')!;

function renderApp() {
  createRoot(rootEl).render(
    <StrictMode>
      <ThemeProvider>
        {/* useTransitions={false}（09-09）：BrowserRouter 默认把 location 更新
            包进 startTransition（scheduler 宏任务提交），会输给 single-spa
            已加载子应用 remount 的微任务链 → 容器缺席 → 子应用 died。
            关闭后 auth↔layout 穿越导航可被 syncNavigate(flushSync) 同步提交；
            项目未用路由级 viewTransition，无副作用。 */}
        <BrowserRouter useTransitions={false}>
          <App />
          <ToastRegion />
        </BrowserRouter>
      </ThemeProvider>
    </StrictMode>,
  );
}

async function bootstrap() {
  // 运行时配置 → 壳 preferences 初始值
  // （config 是部署期权威，壳内切换之后由 preferences 持久化接管）。
  // ① preferences.* 按分组覆盖（tabbar / widget / shortcutKeys 等）
  // ② layout.* 作为 app.layout / app.authPageLayout / theme.mode 的兜底，
  //    preferences 中显式给出的同名字段优先。
  const cfgPrefs = appConfig.preferences;
  const cfgApp = (cfgPrefs.app ?? {}) as Record<string, unknown>;
  const cfgTheme = (cfgPrefs.theme ?? {}) as Record<string, unknown>;
  const cfgHeader = (cfgPrefs.header ?? {}) as Record<string, unknown>;
  const cfgBreadcrumb = (cfgPrefs.breadcrumb ?? {}) as Record<string, unknown>;
  applyConfigPreferences({
    ...cfgPrefs,
    app: {
      layout: appConfig.layout.layout,
      authPageLayout: appConfig.auth.loginPage.layout,
      ...cfgApp,
    },
    theme: { mode: appConfig.layout.theme, ...cfgTheme },
    // layout.fixedHeader / showBreadcrumb 的落点（此前两字段只进 schema、无消费方，
    // 改了不生效）：分别映射 header.mode 与 breadcrumb.enable。默认值 true 对应
    // header.mode='fixed'、breadcrumb.enable=true，与 store 默认一致（无行为变化）。
    header: {
      mode: appConfig.layout.fixedHeader ? 'fixed' : 'static',
      ...cfgHeader,
    },
    breadcrumb: { enable: appConfig.layout.showBreadcrumb, ...cfgBreadcrumb },
  });
  document.documentElement.dataset.theme =
    (cfgTheme.mode as string | undefined) ?? appConfig.layout.theme;

  // 运行时图标注册表（09-08-icon-registry）：config.js 内联 icons 与
  // iconPackUrl JSON 在渲染前注册；异步注册不阻塞菜单渲染（store 驱动补渲染）
  void initIcons();

  // MSW mock：仅当 config.api.useMock=true 时启用（dev 调真实后端时关闭）
  if (import.meta.env.DEV && appConfig.api.useMock) {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }

  setupHostState();

  // 公开子应用（如 iam 登录页）提前注册：幂等，未登录时 token getter 返回 null，
  // 登录后自动变为最新值；已登录链路 restoreSession 尾部调用直接短路。
  setupMicroApps();

  const savedToken = localStorage.getItem(appConfig.auth.tokenKey);
  if (savedToken) {
    await restoreSession(savedToken);
  } else {
    // 未登录：拉公开菜单子集（后端按匿名返回，如 home），
    // 让壳的侧边栏/NavigateHome 在登录前就有落点。
    await loadPublicMenus();
  }

  renderApp();
}

void bootstrap();

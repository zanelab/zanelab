import { Suspense, type ReactNode } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import { appConfig } from '../config';
import i18n from '../locales/i18n';
import type { MenuItem } from '../types';

// 菜单树 → 路由表（§7.1/父 design §6）：
// - appName 为 portal/缺省 → host 本地页（src/pages/** lazy 映射，daisyUI loading 兜底）
// - 其它 → 子应用路由占位（null）；容器 div 由 SubAppLayer 常驻渲染，不 import 子应用源码
// - 兜底：home 重定向、403、404（路径取 config.route.*）

export const PAGE_MAP: Record<
  string,
  React.LazyExoticComponent<React.ComponentType>
> = {};

function PageLoading() {
  return (
    <div className="flex h-64 items-center justify-center">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );
}

/** 本地页懒加载容器 */
function LazyPage({ component }: { component: string }) {
  const Page = PAGE_MAP[component];
  if (!Page) {
    return (
      <div className="p-6">
        <div className="alert alert-warning">
          <span>
            {i18n.t('pages.unregisteredComponent')}
            <code>{component}</code>
          </span>
        </div>
      </div>
    );
  }
  return (
    <Suspense fallback={<PageLoading />}>
      <Page />
    </Suspense>
  );
}

/**
 * 子应用路由占位：真实容器由 SubAppLayer 常驻渲染（见 micro/subapp-layer.tsx）
 * ——路由条件渲染容器会在重挂载时与 qiankun 竞态（Target container not existed）。
 */
function SubAppPlaceholder() {
  return null;
}

function elementFor(item: MenuItem): ReactNode | null {
  const appName = item.appName;
  if (appName && appName !== 'portal') {
    // 仅已注册子应用（config.microApps）产占位路由：容器由 SubAppLayer 常驻
    // 渲染、qiankun 按 activeRule 挂载。菜单下发了 appName 但未注册的子应用
    // 不产路由 → 路径落到顶层 * 兜底 → NotFoundPage（避免渲染 null 导致空白页，
    // 见 09-14 未注册子应用 404 修复）。
    if (!appConfig.microApps[appName]) return null;
    return <SubAppPlaceholder />;
  }
  if (item.component) return <LazyPage component={item.component} />;
  // 纯目录节点（无 component 无 appName）：无路由
  return null;
}

/**
 * 递归构建路由树；叶子节点产 element，父级目录只透传 children。
 * 子路由 path 裁掉父前缀，使 React Router 嵌套匹配正确。
 *   父: /agent_flow → path='agent_flow'
 *   子: /agent_flow/app/list → 裁掉父前缀 → path='app/list'
 *   React Router 拼接: /agent_flow/app/list ✓
 */
function buildRoutes(items: MenuItem[], basePath = ''): RouteObject[] {
  const routes: RouteObject[] = [];
  for (const item of items) {
    // 跳过 button 权限节点（无 path）
    if (!item.path) continue;

    // 子路由相对路径：裁掉父前缀
    let relativePath = item.path;
    if (basePath && relativePath.startsWith(basePath + '/')) {
      relativePath = relativePath.slice(basePath.length + 1);
    }
    const routePath = relativePath.startsWith('/')
      ? relativePath.slice(1)
      : relativePath;

    const element = elementFor(item);
    if (item.children?.length) {
      if (element) {
        // 子应用根：父路由渲染占位，* 兜底让 /agent_flow/* 全部匹配；
        // 子路由裁掉父前缀作为嵌套子路由（React Router 拼接父+子）
        const childRoutes = buildRoutes(item.children, item.path);
        routes.push({
          path: routePath,
          element,
          children: [...childRoutes, { path: '*', element }],
        });
      } else {
        // 纯目录扁平下钻：子路由保持全局路径（basePath='' 不裁父前缀），
        // 否则 '/components/button' 会被裁成顶层 'button' 路由，只能匹配
        // '/button' 而 '/components/button' 落到 * → 404/重定向（09-14 修复）
        const childRoutes = buildRoutes(item.children, '');
        routes.push(...childRoutes);
      }
    } else if (element) {
      routes.push({ path: routePath, element });
    }
  }
  return routes;
}

/**
 * 已注册子应用（config.microApps）的 activeRule 兜底路由。
 *
 * 场景：子应用内部还有宿主菜单树里没有的页面（如 /npa-plt-system/admin/api-key，
 * 菜单只登记了 /npa-plt-system/admin/user）。qiankun 按 activeRule 前缀已经挂载
 * 并在常驻容器里渲染了子应用，但宿主路由表只有菜单里的精确路径 → 落到 `*` →
 * NotFoundPage 与子应用内容叠成「404 蒙层」。故 activeRule 下任意路径都渲染
 * 子应用占位（null，容器由 SubAppLayer 常驻提供），把路由权交给子应用自身。
 *
 * 已存在同前缀路由（如菜单里就有 /npa-plt-system 这个 app 节点，其自带 `*`
 * 兜底）时不重复追加，避免同 path 双路由。
 */
export function subAppCatchAllRoutes(
  existing: RouteObject[] = [],
): RouteObject[] {
  return (
    Object.values(appConfig.microApps)
      .map((cfg) => (cfg.activeRule || '').replace(/^\/+|\/+$/g, ''))
      // 只处理路径型 activeRule（hash 型 '#/xxx' 不参与 host 路由）
      .filter((rule): rule is string => /^[^#]/.test(rule) && rule !== '')
      .filter(
        (rule) =>
          !existing.some((r) => r.path === rule || r.path === `${rule}/*`),
      )
      .map((rule) => ({ path: `${rule}/*`, element: <SubAppPlaceholder /> }))
  );
}

/**
 * 菜单路由（不带 404 兜底）——作为 BasicLayout 子路由使用（Outlet 渲染）。
 * 追加子应用 activeRule 兜底（见 subAppCatchAllRoutes）。
 */
export function buildMenuRoutes(menus: MenuItem[]): RouteObject[] {
  const routes = buildRoutes(menus);
  return [...routes, ...subAppCatchAllRoutes(routes)];
}

/**
 * 生成完整路由表（独立使用场景/测试）：菜单路由 + home 重定向 + 403/404 兜底。
 */
export function generateRoutes(menus: MenuItem[]): RouteObject[] {
  return [
    ...buildMenuRoutes(menus),
    { path: '', element: <Navigate to={appConfig.route.homePath} replace /> },
    {
      path: normalize(appConfig.route.forbiddenPath),
      element: <ForbiddenPage />,
    },
    { path: '*', element: <NotFoundPage /> },
  ];
}

function normalize(path: string): string {
  return path.replace(/^\//, '');
}

function ForbiddenPage() {
  return (
    <div className="flex h-96 items-center justify-center">
      <div className="text-center">
        <h1 className="text-warning text-6xl font-bold">403</h1>
        <p className="text-base-content/70 mt-2">{i18n.t('pages.forbidden')}</p>
      </div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="flex h-96 items-center justify-center">
      <div className="text-center">
        <h1 className="text-base-content/30 text-6xl font-bold">404</h1>
        <p className="text-base-content/70 mt-2">{i18n.t('pages.notFound')}</p>
      </div>
    </div>
  );
}

export { NotFoundPage };

import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import { appConfig } from '../config';
import i18n from '../locales/i18n';
import type { MenuItem } from '../types';

export const PAGE_MAP: Record<
  string,
  React.LazyExoticComponent<React.ComponentType>
> = {
  dashboard: lazy(() => import('../pages/dashboard')),
  'profile/basic': lazy(() => import('../pages/profile/basic')),
  'profile/security': lazy(() => import('../pages/profile/security')),
  'components/button': lazy(() => import('../pages/demo/button')),
  'components/table': lazy(() => import('../pages/demo/table')),
};

function PageLoading() {
  return (
    <div className="flex h-64 items-center justify-center">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );
}

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

function SubAppPlaceholder() {
  return null;
}

function elementFor(item: MenuItem): ReactNode | null {
  const appName = item.appName;
  if (appName && appName !== 'portal') {
    if (!appConfig.microApps[appName]) return null;
    return <SubAppPlaceholder />;
  }
  if (item.component) return <LazyPage component={item.component} />;

  return null;
}

function buildRoutes(items: MenuItem[], basePath = ''): RouteObject[] {
  const routes: RouteObject[] = [];
  for (const item of items) {
    if (!item.path) continue;

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
        const childRoutes = buildRoutes(item.children, item.path);
        routes.push({
          path: routePath,
          element,
          children: [...childRoutes, { path: '*', element }],
        });
      } else {
        const childRoutes = buildRoutes(item.children, '');
        routes.push(...childRoutes);
      }
    } else if (element) {
      routes.push({ path: routePath, element });
    }
  }
  return routes;
}

export function subAppCatchAllRoutes(
  existing: RouteObject[] = [],
): RouteObject[] {
  return Object.values(appConfig.microApps)
    .map((cfg) => (cfg.activeRule || '').replace(/^\/+|\/+$/g, ''))

    .filter((rule): rule is string => /^[^#]/.test(rule) && rule !== '')
    .filter(
      (rule) =>
        !existing.some((r) => r.path === rule || r.path === `${rule}/*`),
    )
    .map((rule) => ({ path: `${rule}/*`, element: <SubAppPlaceholder /> }));
}

export function buildMenuRoutes(menus: MenuItem[]): RouteObject[] {
  const routes = buildRoutes(menus);
  return [...routes, ...subAppCatchAllRoutes(routes)];
}

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

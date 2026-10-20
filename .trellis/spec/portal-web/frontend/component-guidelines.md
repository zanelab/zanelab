# Component Guidelines

> How components are built in `apps/portal-web/`.

---

## Overview

Components in `@zanelab/portal-web` use React functional components with TypeScript. Styling uses Tailwind CSS v4 utility classes plus DaisyUI v5 component classes. Components are organized by role:

- **Layout shell**: `BasicLayout`, `ThemeProvider` -- provide the structural frame.
- **Guards**: `Permission`, `RouteGuard` -- control access based on auth and permissions.
- **Widgets**: `UserDropdown`, `TenantSwitcher`, `Notification`, `ChangePasswordModal` -- feature-level composition.
- **Micro-frontend**: `SubAppLayer` -- container divs for qiankun sub-apps.
- **Pages**: Login, dashboard, auth flows -- lazy-loaded via `PAGE_MAP`.
- **Shared UI**: Re-exported from `@zanelab/ui` (ToastRegion, etc.) and DaisyUI.

---

## Component Structure

Components follow this pattern:

```tsx
// components/RouteGuard.tsx
import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

interface RouteGuardProps {
  children?: ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  // ... logic ...
  return <>{children ?? <Outlet />}</>;
}
```

Key conventions:
1. **Functional components only** -- no class components.
2. **Export named functions** (not default exports).
3. **Props interface colocated** with the component.
4. **Barrel re-exports** via `index.ts` in each directory.
5. **No prop drilling** -- stores are accessed via Zustand hooks directly in the component.

---

## Props Conventions

Props interfaces are always defined inline with the component file:

```tsx
// components/Permission.tsx
interface PermissionProps {
  code: string;
  mode?: 'hide' | 'disabled';
  children: ReactElement;
}

export function Permission({ code, mode = 'hide', children }: PermissionProps) {
  // ...
}
```

Rules:
1. **Optional props with defaults**: Use destructuring defaults (`mode = 'hide'`).
2. **children typing**: Use `ReactNode` for general, `ReactElement` when you need to clone/manipulate.
3. **No `any` in props interfaces**. Prefer explicit types or `Record<string, unknown>`.
4. **Use `type` imports** when only importing types (`import type { ReactNode } from 'react'`).

---

## Styling Patterns

### Tailwind + DaisyUI

Components use Tailwind utility classes and DaisyUI component classes directly in JSX:

```tsx
// Page loading spinner
function Loading() {
  return (
    <div className="flex h-full items-center justify-center">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );
}
```

### DaisyUI Component Classes

| Pattern | Example |
|---------|---------|
| Alert | `<div className="alert alert-warning">` |
| Buttons | `className="btn btn-primary btn-sm"` |
| Spinners | `className="loading loading-spinner loading-lg"` |

### Custom CSS

Menu-specific styles are in `components/menu/menu.css`. Imported in `main.tsx`:
```tsx
import './components/menu/menu.css';
```

Scrollbar styles come from `@zanelab/ui/scrollbar.css`.

### Theme

The `ThemeProvider` component (in `components/theme-provider/index.tsx`) sets `document.documentElement.dataset.theme` based on preferences. In `main.tsx`:
```tsx
document.documentElement.dataset.theme =
  (cfgTheme.mode as string | undefined) ?? appConfig.layout.theme;
```

---

## Lazy Loading Pattern

Pages are lazy-loaded via `React.lazy()` + `Suspense`. The `PAGE_MAP` in `router/generateRoutes.tsx` registers all known page components:

```tsx
// router/generateRoutes.tsx
import { lazy, Suspense, type ReactNode } from 'react';

export const PAGE_MAP: Record<
  string,
  React.LazyExoticComponent<React.ComponentType>
> = {
  dashboard: lazy(() => import('../pages/dashboard')),
  'profile/basic': lazy(() => import('../pages/profile/basic')),
  'components/button': lazy(() => import('../pages/demo/button')),
};

function LazyPage({ component }: { component: string }) {
  const Page = PAGE_MAP[component];
  if (!Page) {
    return <div className="alert alert-warning">Component not found: {component}</div>;
  }
  return (
    <Suspense fallback={<PageLoading />}>
      <Page />
    </Suspense>
  );
}
```

Pages in `App.tsx` are imported at module scope with `lazy()`:

```tsx
const LoginPage = lazy(() => import('@/pages/login'));
const LockPage = lazy(() => import('@/pages/lock'));
```

The `<Suspense>` boundary is at the `App` level:
```tsx
<Suspense fallback={<Loading />}>
  <RouteGuard>
    <LayoutShell />
  </RouteGuard>
</Suspense>
```

---

## Guard Components

### Permission

Hides or disables children based on permission codes:

```tsx
// components/Permission.tsx
export function Permission({ code, mode = 'hide', children }: PermissionProps) {
  const permissions = useMenuStore((state) => state.permissions);
  if (permissions.includes(code)) return children;
  if (mode === 'disabled') {
    return cloneElement(children, {
      disabled: true,
      'aria-disabled': true,
      className: `${children.props.className ?? ''} disabled`,
    } as never);
  }
  return null;
}
```

Usage:
```tsx
<Permission code="user:delete">
  <button className="btn btn-error">Delete</button>
</Permission>
```

### RouteGuard

Guards entire route trees. Redirects unauthenticated users to login, and unauthorized users to `/403`:

```tsx
// components/RouteGuard.tsx
export function RouteGuard({ children }: RouteGuardProps) {
  const token = useAuthStore((state) => state.token);
  const permissions = useMenuStore((state) => state.permissions);
  const menus = useMenuStore((state) => state.menus);
  const location = useLocation();

  if (!token) {
    const from = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${loginPath}?from=${from}`} replace />;
  }

  const menu = findMenuByPath(menus, location.pathname);
  const permission = (menu as { permission?: string } | undefined)?.permission;
  if (permission && !permissions.includes(permission)) {
    return <Navigate to={appConfig.route.forbiddenPath} replace />;
  }

  return <>{children ?? <Outlet />}</>;
}
```

---

## SubAppLayer Pattern

The `SubAppLayer` renders hidden div containers for each registered qiankun micro-application. Only the active sub-app is visible:

```tsx
// micro/subapp-layer.tsx
export function SubAppLayer({ apps }: { apps?: SubAppEntry[] }) {
  const { pathname } = useLocation();
  const entries = apps ?? Object.entries(appConfig.microApps);
  return (
    <>
      {entries.map(([appName, cfg]) => (
        <div
          key={appName}
          id={containerId(appName, cfg.container)}
          data-subapp={appName}
          className="absolute inset-0"
          hidden={!pathname.startsWith(cfg.activeRule)}
        />
      ))}
    </>
  );
}
```

---

## Accessibility

1. **aria-disabled** is set by `Permission` when `mode="disabled"`.
2. **Loading states**: Every lazy route shows a `<Loading />` spinner with `loading-spinner` DaisyUI class.
3. **The `html[lang]` attribute** is synchronized with the current locale: `document.documentElement.lang = locale`.
4. **Color contrast** is governed by the DaisyUI theme (default or custom).

---

## Common Mistakes

1. **Importing stores from another store**: Stores should use `.getState()` and `.subscribe()` instead of importing another store's hook (to avoid circular dependencies).
   ```tsx
   // DO: in tabbar-store.ts
   const maxCount = usePreferencesStore.getState().tabbar.maxCount;
   
   // DON'T: import { usePreferencesStore } from './preferences-store';
   //        and use it inside a store creator
   ```

2. **Using `any` for component props**: Always define explicit interfaces.
3. **Missing Suspense boundary**: Every `lazy()` component must have a Suspense ancestor.
4. **Hardcoding config values**: Use `appConfig.*` from `config/index.ts`, not hardcoded strings.
5. **Barrel export confusion**: Only re-export what is intended to be public. Internal helpers stay in their source files.

6. **SubAppLayer performance**: The empty `<div>` containers for sub-apps are hidden with the `hidden` attribute, not conditionally rendered, so qiankun can mount/unmount within them without React remounting the container.
# Directory Structure

> How code is organized in `apps/portal-web/`.

---

## Overview

`@zanelab/portal-web` (`apps/portal-web/`) is a monorepo package within the `zanelab` pnpm workspace. All source code lives under `src/`, organized into 12 modules. Tests are co-located inside `src/` (e.g., `__tests__/` directories or `*.test.ts(x)` files).

---

## Root Layout

```
apps/portal-web/
├── public/                   # Static assets and MSW service worker
├── scripts/
│   └── env-switch.mjs        # Pre-dev environment switching script
├── src/
│   ├── api/                  # API call wrappers (auth, menu)
│   ├── components/           # Reusable UI and layout components
│   ├── config/               # Runtime config (window.__APP_CONFIG__ + Zod)
│   ├── constants/            # Auth header keys and system type enums
│   ├── contexts/             # React contexts (ConfigProvider)
│   ├── locales/              # i18n setup + translation JSON files
│   ├── micro/                # qiankun micro-frontend registration
│   ├── mocks/                # MSW handlers, browser worker
│   ├── pages/                # Lazy-loaded page components
│   ├── router/               # Route generation from menu tree
│   ├── stores/               # Zustand state management
│   ├── types/                # Type re-exports from @zanelab/types
│   └── utils/                # Auth, crypto, HTTP client, menu helpers
├── index.html                # Vite entry HTML
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Full Source Tree

```
src/
├── main.tsx                  # Bootstrap: config, theme, i18n, icons, MSW, session, render
├── App.tsx                   # Root component: auth routes, layout shell, route guards
├── index.css                 # Global styles
├── vite-env.d.ts             # Vite client type declarations

├── api/
│   ├── auth.ts               # Login, logout, changePassword, getUserPer, findPowerAgent
│   └── menu.ts               # fetchMenus API call

├── components/
│   ├── index.ts              # Barrel re-exports: layouts, ui, menu, tabs
│   ├── Permission.tsx        # Permission guard (hide/disable by code)
│   ├── RouteGuard.tsx        # Auth + permission route guard
│   ├── theme-provider/       # DaisyUI theme context provider
│   │   └── index.tsx
│   ├── icons/                # App-specific icon components
│   │   └── app-icon.tsx      # <AppIcon name="..." /> from icon store
│   ├── layouts/
│   │   ├── index.ts          # Layout barrel exports
│   │   └── basic/
│   │       ├── layout.tsx    # BasicLayout: shell with sidebar, header, content, footer
│   │       └── header/
│   │           └── header.tsx # Header component (exports REFERENCE_VALUE for slot ordering)
│   └── menu/
│       ├── menu.tsx          # Navigation menu component
│       ├── menu.css          # Menu-specific styles
│       └── index.ts
│   └── tabs/
│       ├── tabbar.tsx        # Multi-tab bar component
│       └── index.ts

├── config/
│   └── index.ts              # DEFAULT_CONFIG, mergeConfig, loadConfig, appConfig singleton

├── constants/
│   └── auth.ts               # TOKEN_HEADER, LEGACY_TOKEN_KEY, X_PLATFORM, X_TENANT, etc.

├── contexts/
│   └── ConfigContext.tsx     # ConfigProvider + useConfig hook

├── locales/
│   ├── i18n.ts               # i18next init, switchLocale, syncLocale, menuTitle
│   ├── en-US.json            # English locale bundle
│   └── zh-CN.json            # Chinese locale bundle

├── micro/
│   ├── register.ts           # setupMicroApps, bootstrapSession, host state sync, watchGlobalLogout
│   └── subapp-layer.tsx      # SubAppLayer component (hidden div containers for sub-apps)

├── mocks/
│   ├── browser.ts            # setupWorker for DEV mode
│   ├── server.ts             # MSW server for Node/SSR
│   └── handlers/
│       └── auth.ts           # Auth mock handlers

├── pages/
│   ├── login.tsx             # Login page (lazy-loaded)
│   ├── lock.tsx              # Lock screen page
│   ├── dashboard.tsx         # Dashboard page
│   ├── demos/                # Demo/example pages (button, table)
│   │   ├── button.tsx
│   │   └── table.tsx
│   ├── auth/                 # Auth-related pages
│   │   ├── code-login.tsx    # Verification code login
│   │   ├── forget-password.tsx
│   │   ├── qrcode-login.tsx  # QR code login
│   │   └── register.tsx      # Registration page
│   └── profile/              # User profile pages
│       ├── basic.tsx
│       └── security.tsx

├── router/
│   ├── generateRoutes.tsx    # buildMenuRoutes, generateRoutes, PAGE_MAP, ForbiddenPage, NotFoundPage
│   └── route-meta.ts         # Route metadata registry for tabs

├── stores/
│   ├── auth-store.ts         # Token, user, login/logout actions
│   ├── menu-store.ts         # Menu tree, permissions, flattenPermissions
│   ├── session-store.ts      # Tenant/org/platform session state
│   ├── layout-store.ts       # Sidebar, header, mobile state
│   ├── preferences-store.ts  # Full preferences with persist middleware
│   ├── icon-store.ts         # Icon registry with Zod validation
│   ├── tabbar-store.ts       # Tab management with persist middleware
│   └── timezone-store.ts     # Timezone selection with persist middleware

├── types/
│   └── index.ts              # Re-exports everything from @zanelab/types

└── utils/
    ├── auth.ts               # handleLogout, clearStoredTokens
    ├── crypto.ts             # encryptPassword (SM4 or btoa fallback)
    ├── http.ts               # axios instance, interceptors, token refresh queue, httpProxy
    ├── menu-views.ts         # toShellMenus, collectDropdownMenus, findFirstNavigablePath
    └── session-headers.ts    # Legacy header construction for backward compat
```

---

## Module Dependencies

```
main.tsx --> config/index.ts (appConfig)
         --> stores/preferences-store.ts (applyConfigPreferences)
         --> stores/icon-store.ts (initIcons)
         --> locales/i18n.ts (i18next init)
         --> micro/register.ts (setupHostState, restoreSession)
         --> mocks/browser.ts (DEV mode MSW)

App.tsx  --> stores/auth-store.ts
         --> stores/menu-store.ts
         --> stores/session-store.ts
         --> stores/layout-store.ts
         --> router/generateRoutes.tsx
         --> micro/register.ts (watchGlobalLogout)
         --> micro/subapp-layer.tsx
         --> api/auth.ts
         --> utils/auth.ts
         --> utils/menu-views.ts
         --> components/RouteGuard.tsx
         --> components/Permission.tsx
```

## Naming Conventions

| Rule | Example |
|------|---------|
| Store files: `<domain>-store.ts` | `auth-store.ts`, `menu-store.ts` |
| Store hooks: `use<Domain>Store` | `useAuthStore`, `useMenuStore` |
| API modules: `<domain>.ts` | `auth.ts`, `menu.ts` |
| Components: PascalCase files | `Permission.tsx`, `RouteGuard.tsx` |
| Pages: kebab-case folders | `code-login.tsx`, `forget-password.tsx` |
| Constants: UPPER_SNAKE_CASE | `TOKEN_HEADER`, `X_PLATFORM` |
| Config keys: camelCase | `tokenKey`, `refreshTokenKey`, `loginPath` |
| Barrel exports: `index.ts` in directory | `components/index.ts`, `stores/...` |

## Organization Rules

1. **Co-located tests**: Tests go in `__tests__/` directories alongside their source files, or as `*.test.ts(x)` files in the same directory.
2. **Barrel exports**: Every module directory has an `index.ts` that re-exports public APIs. Internal helpers stay unexported.
3. **No circular dependencies**: Store files never import other stores' hooks (use `.getState()` or `.subscribe()` for cross-store access).
4. **API layer isolation**: Components and stores never import `axios` directly -- they use the API modules in `api/` or the raw `http` instance.
5. **Config is singleton**: `appConfig` from `config/index.ts` is a module-level constant; it is NOT injected through props or context for most uses.
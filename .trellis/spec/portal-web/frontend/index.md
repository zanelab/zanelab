# Frontend Development Guidelines -- @zanelab/portal-web

> SOP, patterns, and conventions for the qiankun host portal application (`apps/portal-web/`).

---

## Overview

`@zanelab/portal-web` is the main qiankun micro-frontend host application. It provides the shell layout, authentication, permission routing, tab management, session/tenant switching, and micro-frontend sub-application orchestration. All 12 modules under `src/` follow a single-responsibility principle.

| Module | Responsibility |
|--------|----------------|
| `api/` | Auth, menu, and user permission API calls (axios) |
| `components/` | Layout shell, auth widgets, menu, tabs, guards, theme |
| `config/` | Runtime config via `window.__APP_CONFIG__`, Zod-validated with deep-merge defaults |
| `constants/` | Auth header names, tenant/platform/org token keys |
| `contexts/` | React context for app config (ConfigProvider) |
| `locales/` | i18next + react-i18next (en-US / zh-CN) |
| `micro/` | Qiankun registerMicroApps, host state sync, subapp container layer |
| `mocks/` | MSW handlers, browser worker, server-side setup |
| `pages/` | Lazily-loaded page components: login, dashboard, auth flows, lock screen |
| `router/` | Route generation from menu tree (React Router 7) |
| `stores/` | 8 Zustand v5 stores: auth, menu, session, layout, preferences, icon, tabbar, timezone |
| `types/` | Re-exports from `@zanelab/types` |
| `utils/` | Auth, crypto (SM4), HTTP client, menu-views utility, session helpers |

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Module organization and file layout | Filled |
| [Component Guidelines](./component-guidelines.md) | Component patterns, props, composition | Filled |
| [Hook Guidelines](./hook-guidelines.md) | Custom hooks, data fetching patterns | Filled |
| [State Management](./state-management.md) | Local state, global state, server state | Filled |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, forbidden patterns | Filled |
| [Type Safety](./type-safety.md) | Type patterns, validation | Filled |

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | ^19.2 |
| Build | Vite | ^8.2 |
| Router | react-router-dom | ^7.18 |
| State | Zustand | ^5.0 |
| Styling | Tailwind CSS + DaisyUI | ^4.3 / ^5.7 |
| HTTP | axios | ^1.0 |
| Forms/I18n | i18next + react-i18next | ^26 / ^17 |
| Crypto | sm-crypto (SM4) | ^0.3 |
| Validation | Zod | ^4.5 |
| Micro-frontend | qiankun | ^2.10 |
| Linting | oxlint | ^1.79 |
| Testing | Vitest + Testing Library + MSW | ^5 / ^16 / ^2.7 |
| Language | TypeScript | ~6.0 |
| Package manager | pnpm | workspace |

---

## Key Architecture Decisions

1. **Zustand v5 stores** use `create<T>()((set, get) => ({...}))` pattern. No Provider wrappers; stores are consumed via named hooks (e.g., `useAuthStore`, `useMenuStore`).
2. **React Router 7** lazy-loading: pages are defined in a `PAGE_MAP` object keyed by component path and loaded via `React.lazy()` + `<Suspense>`.
3. **qiankun host**: `registerMicroApps` is called from `bootstrapSession` after menus load. Host state (token, user, permissions, locale) is synced to sub-apps via `getHostState()` / `onHostStateChange()`.
4. **Runtime config**: `window.__APP_CONFIG__` is deeply merged into `DEFAULT_CONFIG` and validated against `AppConfigSchema` (Zod). Config is available as `appConfig` (module-level singleton exported from `config/index.ts`).
5. **Axios interceptors**: request interceptor injects `ailab-token` header and legacy session headers; response interceptor handles 401 with a token-refresh queue pattern.
6. **SM4 encryption**: passwords are encrypted before login when `auth.loginWithSm4` is enabled; falls back to `btoa()`.
7. **Permission system**: `Permission` component hides/disables children by permission code; `RouteGuard` redirects to `/403` when a menu item requires a permission the user lacks.
8. **i18next** is initialized once in `locales/i18n.ts` with bundled en-US/zh-CN resources. Locale changes sync to localStorage and trigger `languageChanged` event.
9. **MSW**: `browser.ts` worker started in DEV mode when `appConfig.api.useMock` is true.

---

**Language**: English (all documentation and generated code).
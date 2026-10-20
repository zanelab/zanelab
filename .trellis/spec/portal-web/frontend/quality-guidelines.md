# Quality Guidelines

> Code quality standards for `apps/portal-web/`.

---

## Overview

Quality is enforced through these layers:

| Layer | Tool | Command |
|-------|------|---------|
| Linting | oxlint | `pnpm lint` (aliases to `oxlint src`) |
| Type checking | tsc | `tsc -b` (part of the build pipeline) |
| Testing | Vitest + Testing Library | `pnpm test` / `pnpm test:watch` |
| API mocking | MSW | Integrated in DEV mode and tests |
| Style linting | stylelint + prettier | Via root scripts |

---

## Forbidden Patterns

### State Management

1. **Never mutate state directly** -- always use `set()` in Zustand stores.
   ```tsx
   // WRONG
   state.tabs.push(newTab);
   
   // CORRECT
   set({ tabs: [...state.tabs, newTab] });
   ```

2. **Never import a store hook inside another store file** -- use `.getState()`.
   ```tsx
   // WRONG in tabbar-store.ts
   import { usePreferencesStore } from './preferences-store';
   
   // CORRECT
   const prefs = usePreferencesStore.getState();
   ```

3. **Never dispatch side effects from store actions** -- async work (API calls, localStorage) belongs in the API layer or bootstrap, not in state setters.

### HTTP

4. **Never use raw `fetch`** in components or stores. All HTTP goes through the `axios` instance exported from `utils/http.ts`.
5. **Never hardcode API URLs**. All endpoints come from `appConfig.api.*`.
6. **Never handle token management manually** in individual API calls. The axios interceptor injects tokens and handles refresh automatically.

### Components

7. **Never use default exports** for components. All components use named exports.
8. **Never use `any` for prop types** -- always use explicit interfaces.
9. **Never render `<Suspense>`-gated components without a Suspense ancestor**. Every `lazy()` import must have a parent `<Suspense>`.

### Config

10. **Never read `window.__APP_CONFIG__` directly** outside of `config/index.ts`. Use `appConfig` or `DEFAULT_CONFIG`.
11. **Never bypass `AppConfigSchema` validation** -- always use `loadConfig()` which validates and falls back gracefully.

### Types

12. **Never use `// @ts-ignore`** -- fix the underlying type issue.
13. **Never use `any`** -- use `unknown` and narrow with type guards.

---

## Required Patterns

### Config Access

```tsx
import { appConfig } from '@/config';

// Access any config value:
const baseURL = appConfig.api.baseURL;
const loginPath = appConfig.auth.loginPath;
```

### i18n Strings

All user-visible strings must use `t()` from `useTranslation()` or `i18n.t()`:

```tsx
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
<div>{t('common.http.sessionExpired')}</div>
```

### Error Handling in API Calls

```tsx
// In api/auth.ts
try {
  return await get<UserPerVO>(appConfig.api.userPerEndpoint);
} catch (e) {
  console.warn('[getUserPer] failed:', e);
  return null; // graceful fallback, never crash
}
```

### Token Headers

```tsx
// constants/auth.ts
export const TOKEN_HEADER = 'ailab-token';
// In http.ts interceptor:
headers[TOKEN_HEADER] = token;
```

---

## Testing Requirements

### Test Runner: Vitest

```json
// package.json
"test": "vitest run",
"test:watch": "vitest"
```

### Test Libraries

| Library | Purpose |
|---------|---------|
| `vitest` | Test runner, assertions, mocks |
| `@testing-library/react` | Component rendering and queries |
| `@testing-library/jest-dom` | DOM matchers (toBeInTheDocument, etc.) |
| `@testing-library/user-event` | Simulating user interactions |
| `msw` | API request interception |
| `jsdom` | Browser environment simulation |

### Test File Location

Tests are co-located with source files. Patterns:
- `src/**/__tests__/*.test.ts(x)` -- in dedicated test directories
- `src/**/*.test.ts(x)` -- alongside source files

### What to Test

1. **Store logic**: Pure state transitions (set, get actions).
2. **Components**: Render with given props, conditional rendering (guards).
3. **Route generation**: Given menu trees, generate correct RouteObject arrays.
4. **Config merging**: Given custom config overrides, produce valid merged config.
5. **HTTP interceptors**: Token injection, refresh flow, error handling.

### MSW for Test & Dev

In DEV mode, MSW intercepts API requests:
```tsx
// main.tsx
if (import.meta.env.DEV && appConfig.api.useMock) {
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}
```

For tests, MSW provides a `server.ts` that can be used with `setupServer`:
```tsx
// mocks/server.ts -- Node-side MSW
```

MSW worker directory is `public/` (configured in `package.json`):
```json
"msw": { "workerDirectory": ["public"] }
```

---

## Code Review Checklist

- [ ] Are new Zustand stores placed in `stores/` with correct naming (`<domain>-store.ts`)?
- [ ] Does any new store import another store's hook? (Should use `.getState()`)
- [ ] Are all user-facing strings wrapped in `t()`?
- [ ] Are API endpoints referenced from `appConfig.api.*`?
- [ ] Are passwords encrypted via `encryptPassword()` from `utils/crypto.ts`?
- [ ] Are lazy-loaded pages registered in `PAGE_MAP` in `router/generateRoutes.tsx`?
- [ ] Do new components use named exports?
- [ ] Are component props typed with explicit interfaces (not `any`)?
- [ ] Is `Suspense` boundary present for any new `lazy()` pages?
- [ ] Are MSW handlers updated for new API endpoints?
- [ ] Do tests pass: `pnpm test`?
- [ ] Does lint pass: `pnpm lint`?
- [ ] Does type-check pass: `tsc -b`?
- [ ] Is `import type` used for type-only imports?
- [ ] Are new store actions pure state transitions (no async side effects in setters)?
- [ ] Does any new code access `window.__APP_CONFIG__` directly? (Should use `appConfig`)

---

## Build Pipeline

```
pnpm build  -->  tsc -b  -->  vite build
                (type      (bundle with
                 check)     @vitejs/plugin-react)
```

`tsc -b` runs first to catch type errors before bundling. The Vite config uses `@vitejs/plugin-react` for JSX transform and `@tailwindcss/vite` for Tailwind v4 integration.

---

## Environment Switching

```bash
pnpm dev  -->  node scripts/env-switch.mjs  &&  vite
```

The `env-switch.mjs` script configures environment-specific settings before starting the dev server (e.g., mock API, local vs. staging endpoints).
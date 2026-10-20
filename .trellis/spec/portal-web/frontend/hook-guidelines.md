# Hook Guidelines

> How hooks are used in `apps/portal-web/`.

---

## Overview

The portal app has a flat custom-hook footprint. Most stateful logic lives in Zustand stores, and components subscribe through Zustand selectors. The app defines a handful of React custom hooks and one React context hook.

---

## Custom Hook Patterns

### Context Hook: `useConfig`

Exposes the Zod-validated `AppConfig` through React context, with a fallback to the module-level singleton:

```tsx
// contexts/ConfigContext.tsx
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { loadConfig } from '../config';
import type { AppConfig } from '@zanelab/types';

const ConfigContext = createContext<AppConfig | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const config = useMemo(() => loadConfig(), []);
  return (
    <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
  );
}

export function useConfig(): AppConfig {
  const config = useContext(ConfigContext);
  return config ?? loadConfig();
}
```

This is the standard pattern for optional-context hooks: accept a context value, fall back to module-level or default. The `ConfigProvider` is available for tests but the `appConfig` singleton is used in production code.

---

## Zustand Selector Hooks (Store Consumption)

Every Zustand store exports a hook following `use<Domain>Store` naming:

```tsx
// stores/auth-store.ts
export const useAuthStore = create<AuthStore>()((set) => ({
  token: '',
  setToken: (token) => set({ token }),
}));

// Usage in components:
const token = useAuthStore((state) => state.token);
const user = useAuthStore((state) => state.user);
```

### Selector Best Practices

1. **Select only what you need** -- avoid subscribing to the entire store:
   ```tsx
   // GOOD: selective subscription
   const token = useAuthStore((state) => state.token);
   
   // AVOID: full state subscription
   const { token, user } = useAuthStore();
   ```

2. **Cross-store access outside React**: Use `.getState()` and `.subscribe()`:
   ```tsx
   // In http.ts interceptors (outside React):
   const token = useAuthStore.getState().token;
   
   // In tabbar-store.ts:
   const maxCount = usePreferencesStore.getState().tabbar.maxCount;
   ```

3. **Store subscriptions for cross-store sync**:
   ```tsx
   // In locales/i18n.ts:
   usePreferencesStore.subscribe((state, prev) => {
     if (state.app.locale === prev.app.locale) return;
     // react to locale change
   });
   ```

---

## React Router 7 Hooks

The app uses standard React Router 7 hooks:

```tsx
// App.tsx
const navigate = useNavigate();
const location = useLocation();
const navigationType = useNavigationType();
const { t, i18n } = useTranslation();

// Route generation uses useRoutes:
return useRoutes([...]);
```

---

## React i18next Hooks

```tsx
import { useTranslation } from 'react-i18next';

const { t, i18n } = useTranslation();
const language = i18n.language;
```

All user-facing strings use the `t()` function. Menu names support i18n keys via the `menuTitle()` utility in `locales/i18n.ts`.

---

## Naming Conventions

| Pattern | Naming |
|---------|--------|
| Store hooks | `use<Domain>Store` |
| Context hooks | `use<Feature>` |
| Regular hooks | `useCamelCase` |
| Store creator function | `create<Type>()((set, get) => ({...}))` |

---

## Data Fetching

Data fetching is done through the `api/` module layer using axios, NOT through custom hooks like `useQuery`:

```tsx
// api/auth.ts
export const authApi = {
  async login(params: { username: string; password: string }): Promise<LoginResult> {
    const body = {
      loginChanel: appConfig.auth.loginChannel,
      email: `${params.username}${emailSuffix}`,
      password: encryptPassword(params.password),
    };
    return await post<LegacyLoginResponse>(appConfig.api.loginEndpoint, body);
  },
};
```

Fetching is triggered imperatively (in event handlers or bootstrap), not through data-fetching hooks. There is no React Query or SWR in this package.

---

## Common Mistakes

1. **Importing store hooks in another store file**: This creates hard-to-debug circular dependencies. Use `.getState()` and `.subscribe()` on the static store object instead.
   ```tsx
   // WRONG in a store:
   import { usePreferencesStore } from './preferences-store';
   const prefs = usePreferencesStore((s) => s.tabbar); // DON'T
   
   // CORRECT:
   const prefs = usePreferencesStore.getState().tabbar; // OK
   ```

2. **Selecting too much from a store**: Every state slice change triggers re-render. Select narrow slices.
   ```tsx
   // BAD: re-renders when menus change but we only need token
   const { token, menus } = useAuthStore(); 
   
   // GOOD:
   const token = useAuthStore((state) => state.token);
   ```

3. **Forgetting the `useMemo` dependency array in ConfigProvider**: The config is derived once at mount time.
4. **Using hooks outside component lifecycle**: In axios interceptors, `HttpService`, or `main.tsx` bootstrap, use `.getState()` instead.
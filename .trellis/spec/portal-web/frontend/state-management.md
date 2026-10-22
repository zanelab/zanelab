# State Management

> How state is managed in `apps/portal-web/`.

---

## Overview

State management uses **Zustand v5** exclusively. There are 8 stores, each covering a distinct domain. No React context is used for state management (only a thin `ConfigContext` for config injection in tests). No Redux, MobX, or other state libraries are present.

All stores follow the pattern:
```tsx
import { create } from 'zustand';

interface MyStore extends MyState {
  // actions
  setX: (value: X) => void;
}

export const useMyStore = create<MyStore>()((set, get) => ({
  ...initialState,
  setX: (value) => set({ x: value }),
}));
```

---

## State Categories

### Auth State (`stores/auth-store.ts`)

Owner of authentication credentials. Does NOT use persist middleware -- tokens are stored in `localStorage` separately and restored during bootstrap.

```tsx
export interface AuthState {
  token: string;
  refreshToken?: string;
  user: UserInfo | null;
}

export const useAuthStore = create<AuthStore>()((set) => ({
  ...initialAuthState,
  setToken: (token) => set({ token }),
  setAuth: ({ token, refreshToken, user }) =>
    set({ token, refreshToken, user: user ?? null }),
  setUser: (user) => set({ user }),
  logout: () => set({ token: '', refreshToken: undefined, user: null }),
}));
```

---

### Menu State (`stores/menu-store.ts`)

Holds the menu tree from the API and derived permissions. Permissions are flattened from menu items during `setMenus`:

```tsx
export interface MenuState {
  menus: MenuItem[];
  permissions: string[];
}

export const useMenuStore = create<MenuStore>()((set, get) => ({
  ...initialMenuState,
  setMenus: (menus) => set({ menus, permissions: flattenPermissions(menus) }),
  mergePermissions: (codes) => {
    const extra = codes.filter((p) => !get().permissions.includes(p));
    if (extra.length) set({ permissions: [...get().permissions, ...extra] });
  },
  clearMenus: () => set({ menus: [], permissions: [] }),
}));

export function flattenPermissions(items: MenuItem[]): string[] {
  const result: string[] = [];
  const walk = (list: MenuItem[]) => {
    for (const item of list) {
      if (item.permission) result.push(item.permission);
      if (item.children?.length) walk(item.children);
    }
  };
  walk(items);
  return result;
}
```

---

### Session State (`stores/session-store.ts`)

Holds multi-tenant session information: current platform level (platform/tenant/org), tenant list, organization list:

```tsx
export interface SessionState {
  userPer: UserPerVO | null;
  tenantList: UserTenantPerVO[];
  isPlatform: boolean;
}

export const useSessionStore = create<SessionStore>()((set) => ({
  ...initialSessionState,
  setUserPer: (userPer) =>
    set({
      userPer,
      tenantList: userPer?.tenantList ?? [],
      isPlatform: userPer?.isPlatform ?? false,
    }),
  clear: () => set({ ...initialSessionState }),
}));
```

Utility functions exported from the same file (`getCurrentTenant`, `getCurrentOrg`, `isPlatformAdmin`, etc.) use `cache` (from `@zanelab/utils`) to read tenant/org/platform from session headers.

---

### Layout State (`stores/layout-store.ts`)

Transient UI state for sidebar, header, mobile mode, lock screen:

```tsx
export const useLayoutStore = create<LayoutState>((set) => ({
  mode: 'sidebar-nav',
  sidebarCollapsed: false,
  sidebarExpandOnHover: false,
  headerMode: 'fixed',
  isMobile: false,
  isDark: false,
  lockScreenPassword: '',
  // ... individual setters for each field ...
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
```

---

### Preferences State with Persist Middleware (`stores/preferences-store.ts`)

The largest store. Uses `zustand/middleware` `persist` to save to `localStorage` under key `zanelab-preferences`. Contains deeply nested configuration for layout, theme, sidebar, header, footer, tabbar, breadcrumb, navigation, logo, copyright, widgets, shortcut keys, transitions, and more.

Key patterns:

**Persist middleware with partialize and custom merge:**
```tsx
export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      ...defaultPreferences,
      // actions ...
      toggleSidebar: () =>
        set((s) => ({ sidebar: { ...s.sidebar, hidden: !s.sidebar.hidden } })),
    }),
    {
      name: PREFERENCES_STORAGE_KEY, // 'zanelab-preferences'
      partialize: (state) => {
        const { updatePreferences, setLayout, ...rest } = state;
        return rest; // strip actions before persisting
      },
      merge: (persisted, current) => {
        // deep-merge persisted into current
        const merged = { ...current };
        for (const [key, value] of Object.entries(persisted)) {
          if (isPlainObject(value) && isPlainObject(merged[key])) {
            merged[key] = { ...merged[key], ...value };
          } else {
            merged[key] = value;
          }
        }
        return merged;
      },
    },
  ),
);
```

**Config-driven initialization** via `applyConfigPreferences`:
```tsx
export function applyConfigPreferences(prefs: Record<string, unknown>): void {
  usePreferencesStore.setState((s) => {
    const next = { ...s } as Record<string, unknown>;
    for (const [key, value] of Object.entries(prefs)) {
      const existing = next[key];
      if (isPlainObject(existing) && isPlainObject(value)) {
        next[key] = { ...existing, ...value };
      } else {
        next[key] = value;
      }
    }
    return next;
  });
}
```

Called in `main.tsx` bootstrap:
```tsx
const cfgPrefs = appConfig.preferences;
applyConfigPreferences({
  ...cfgPrefs,
  app: { layout: appConfig.layout.layout, ...cfgApp },
  theme: { mode: appConfig.layout.theme, ...cfgTheme },
  header: { mode: appConfig.layout.fixedHeader ? 'fixed' : 'static', ...cfgHeader },
});
```

**Locale handling**: User-chosen locale is tracked separately (`USER_LOCALE_KEY` in localStorage) so config changes don't override it:
```tsx
const keepUserLocale = hasUserChosenLocale();
if (key === 'app' && keepUserLocale) {
  group.locale = (existing as { locale?: unknown }).locale;
}
```

---

### Tabbar State with Persist Middleware (`stores/tabbar-store.ts`)

Persists to `sessionStorage` (not localStorage) under key `admin-tabbar`. Handles tab CRUD, pinning, sorting, caching, and visit history:

```tsx
export const useTabbarStore = create<TabbarState>()(
  persist(
    (set, get) => ({
      cachedTabs: new Set(),
      tabs: [],
      visitHistory: [],
      // ... 20+ action methods ...
    }),
    {
      name: 'admin-tabbar',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        tabs: state.tabs.map((tab) =>
          tab.meta?.icon
            ? { ...tab, meta: { ...tab.meta, icon: undefined } }
            : tab,
        ),
        visitHistory: state.visitHistory,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...persisted,
        tabs: (persisted as any)?.tabs?.map((tab) => {
          const meta = getRouteMeta(tab.path);
          return meta?.icon
            ? { ...tab, meta: { ...tab.meta, icon: meta.icon } }
            : tab;
        }) ?? current.tabs,
      }),
    },
  ),
);
```

Key tab operations: `addTab`, `closeTab`, `closeAllTabs`, `closeLeftTabs`, `closeRightTabs`, `closeOtherTabs`, `pinTab`, `unpinTab`, `sortTabs`, `refresh`.

---

### Icon State (`stores/icon-store.ts`)

Registers SVG icon packs with Zod validation. Exposes `window.__registerIcons` for dynamic registration:

```tsx
export const useIconStore = create<IconState>((set) => ({
  icons: {},
  registerIcons: (pack) => {
    const next = sanitizePack(pack);
    if (!Object.keys(next).length) return;
    set((state) => ({ icons: { ...state.icons, ...next } }));
  },
}));

window.__registerIcons = (pack) => useIconStore.getState().registerIcons(pack);
```

---

### Timezone State with Persist Middleware (`stores/timezone-store.ts`)

Persists timezone selection to localStorage under key `core-timezone`:

```tsx
export const useTimezoneStore = create<TimezoneState>()(
  persist(
    (set) => ({
      timezone: getCurrentTimezone(),
      setTimezone: async (timezone: string) => set({ timezone }),
    }),
    {
      name: 'core-timezone',
      partialize: (state) => ({ timezone: state.timezone }),
    },
  ),
);
```

---

## When to Use Global State

| Criteria | Solution |
|----------|----------|
| Shared across 3+ components | Zustand store |
| Needs to survive navigation | Zustand store |
| Persisted across sessions | Zustand + persist middleware |
| Local to one component tree | React `useState` |
| Derived from existing state | Selector pattern, no new store |
| Form state | Local `useState` in form component |

---

## Cross-Store Communication

Stores communicate without circular imports using `.getState()` and `.subscribe()`:

```tsx
// stores/tabbar-store.ts referencing preferences
const maxCount = usePreferencesStore.getState().tabbar.maxCount;

// micro/register.ts subscribing to multiple stores
useAuthStore.subscribe(pushIfChanged);
useMenuStore.subscribe(pushIfChanged);
usePreferencesStore.subscribe(pushIfChanged);
```

---

## Common Mistakes

1. **Putting transient UI state in persist stores**: Only persist things users expect to survive refreshes (preferences, tabs, timezone). Layout collapse state belongs in `layout-store` (not persisted).
2. **Using `setTimeout` for async init in stores**: Store actions should be synchronous or return Promises. Async bootstrap logic goes in `main.tsx` or API layer.
3. **Storing derived data**: Compute permissions from menus in `setMenus` action. Don't store as separate state that can desync.

---

## Pattern: Supabase Auth + Zustand Bridge

**Context**: `auth-store.ts` bridges Supabase Auth sessions into Zustand state.

### State Shape

```typescript
interface AuthState {
  session: Session | null;      // Supabase session (access_token, refresh_token, expires_at)
  user: User | null;            // Supabase user (id, email, user_metadata)
  token: string;               // Derived from session.access_token for backward compat
  refreshToken: string | undefined;
  isInitialized: boolean;       // true AFTER getSession() completes
}
```

### Initialization (called once from `App.tsx` on mount)

```typescript
init: async () => {
  // 1. Register onAuthStateChange FIRST — catches sign-in from other tabs, token refreshes
  supabase.auth.onAuthStateChange((_event, session) => {
    set({
      session,
      user: session?.user ?? null,
      token: session?.access_token ?? '',
      refreshToken: session?.refresh_token,
    });
  });

  // 2. Then restore existing session (reads from Supabase localStorage cache, ~1ms)
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      set({ session, user: session.user, token: session.access_token,
            refreshToken: session.refresh_token, isInitialized: true });
    } else {
      set({ isInitialized: true });
    }
  } catch (err) {
    console.error('[auth-store] init failed:', err);
    set({ isInitialized: true });  // ALWAYS set — RouteGuard blocks on !isInitialized
  }
}
```

### Key Rules

1. **`isInitialized` must always reach `true`** — even on error. Otherwise RouteGuard shows loading spinner forever.
2. **`onAuthStateChange` must be registered BEFORE `getSession()`** — prevents race condition where a concurrent sign-in fires before the listener exists.
3. **Do NOT manually manage Supabase token storage** — Supabase JS SDK handles localStorage, token refresh, and expiry. The store only mirrors what Supabase provides.
4. **`token` field kept for backward compat** — sub-apps and legacy code references `useAuthStore.getState().token`. It's derived from `session.access_token`, not set independently.

### Sub-app Integration

```typescript
// In qiankun props — backward compat, both work:
get accessToken() { return useAuthStore.getState().token; },
get token() {       return useAuthStore.getState().token; },
```

### Sign Out

```typescript
logout: async () => {
  await supabase.auth.signOut();  // Supabase clears its localStorage + invalidates server-side
  set({ session: null, user: null, token: '', refreshToken: undefined });
}
```
4. **Mutating store state directly**: Always use `set()` -- never mutate `get().someList.push(item)`.
5. **Oversized persist payload**: Use `partialize` to exclude non-serializable data (functions, Sets, Maps) and strip ephemeral fields.
# Qiankun Sub-App Registration Patterns

> Analysis of portal-web's current qiankun implementation and patterns for dynamic, standardized sub-app registration.
> Written 2026-10-22 for task `supabase-platform-architecture`.

---

## 1. Current portal-web Implementation

### File: `apps/portal-web/src/micro/register.ts`

#### How registration works

```ts
// Config-driven registration (static)
const apps: RegistrableApp[] = Object.entries(appConfig.microApps).map(([appName, cfg]) => ({
  name: cfg.name || appName,       // unique app name
  entry: cfg.entry,                // HTML entry URL (e.g., '//localhost:3001')
  container: `#${containerId}`,    // DOM mount point
  activeRule: cfg.activeRule,      // URL prefix (e.g., '/iam')
  props: { ...cfg.props, ... },    // injected props (see section 4)
}));

registerMicroApps(apps);
start({ sandbox: { experimentalStyleIsolation: true } });
```

#### Config shape

```ts
// From packages/types/src/config.ts
MicroAppConfigSchema = z.object({
  name: z.string(),
  entry: z.string(),
  container: z.string(),
  activeRule: z.string(),
  props: z.record(z.string(), z.unknown()).default({}),
  prefetch: z.boolean().default(false),
});

// Usage in AppConfig:
microApps: z.record(z.string(), MicroAppConfigSchema).default({})
```

#### Where config comes from

```ts
export const DEFAULT_CONFIG = { microApps: {} };
// Merged with window.__APP_CONFIG__ at runtime via mergeConfig()
```

Config is injected via `window.__APP_CONFIG__` — a global JSON object placed in the HTML by the deployment system. This means **all micro-app config is static at build/deploy time**.

#### Registration guard

```ts
let registered = false;
export function setupMicroApps() {
  if (registered) return;  // prevents double-registration
  // ...
  registered = true;
}
```

`setupMicroApps()` is called from `bootstrapSession()` (post-login) and `restoreSession()`. Registration happens after authentication succeeds — sub-apps are only registered once the user is logged in.

#### Route generation for sub-apps

In `generateRoutes.tsx`:
```ts
function elementFor(item: MenuItem): ReactNode | null {
  const appName = item.appName;
  if (appName && appName !== 'portal') {
    if (!appConfig.microApps[appName]) return null;  // skip unregistered
    return <SubAppPlaceholder />;                     // qiankun attaches here
  }
  // ... handles portal-internal components
}
```

The catch-all route ensures qiankun can match sub-app routes:
```ts
export function subAppCatchAllRoutes(existing: RouteObject[]): RouteObject[] {
  return Object.values(appConfig.microApps)
    .map(cfg => cfg.activeRule.replace(/^\/+|\/+$/g, ''))
    .filter(rule => rule !== '')
    .map(rule => ({ path: `${rule}/*`, element: <SubAppPlaceholder /> }));
}
```

#### Host state synchronization

`setupHostState()` subscribes to Zustand stores and pushes changes to sub-apps via registered listeners:

```ts
type HostState = {
  token: string;
  user: UserInfo | null;
  permissions: string[];
  locale: string;
};
```

Sub-apps can call `getHostState()` or `onHostStateChange(listener)` to receive updates.

---

## 2. Dynamic Registration — Patterns

### Is dynamic registration supported?

**Yes**, but portal-web doesn't use it yet. qiankun supports:

1. **`registerMicroApps` at any time** — not just once. The `registered` guard in portal-web is self-imposed.
2. **API-driven config**: Load `microApps` from a backend API, then call `registerMicroApps` with the result.

### Proposed pattern: API-driven registration

```ts
// micro/register.ts (refactored)
let dynamicAppsRegistered = false;

export async function setupMicroApps() {
  // 1. Load micro-app config from API (cached)
  const remoteApps = await fetchMicroAppConfig(); // GET /api/micro-apps

  // 2. Merge with static config from window.__APP_CONFIG__
  const allApps = { ...appConfig.microApps, ...remoteApps };

  // 3. Register all
  const apps: RegistrableApp[] = Object.entries(allApps).map(...);
  registerMicroApps(apps);

  if (!dynamicAppsRegistered) {
    start({ sandbox: { experimentalStyleIsolation: true } });
    dynamicAppsRegistered = true;
  }
}
```

#### API response shape

```ts
// GET /api/v1/micro-apps → Kong → iam-server
interface MicroAppRegistryEntry {
  name: string;           // 'iam'
  title: string;          // 'Identity & Access Management'
  entry: string;          // '//localhost:3001' (dev) or '/apps/iam/' (prod)
  activeRule: string;     // '/iam'
  icon?: string;          // icon name or URL
  prefetch: boolean;
  enabled: boolean;
  menuItems: MenuItem[];  // sub-app declares its own menu tree
  props?: Record<string, unknown>;
}
```

#### Benefits
- **Zero portal-web code changes** to add a new sub-app.
- **Feature flags**: `enabled: false` hides the sub-app without redeploying portal-web.
- **Environment-adaptive entries**: Dev → localhost, prod → CDN path, managed by API config.

#### Cache strategy
- Cache the micro-app registry in localStorage or sessionStorage.
- Refresh on login or on a staleness interval (e.g., 5 minutes).
- Fall back to cached config if API is unreachable.

---

## 3. Standardized Sub-App Contract

### Minimum contract a new sub-app must fulfill

#### 3a. Lifecycle hooks

Every qiankun sub-app exports three lifecycle functions:

```ts
// main.ts (sub-app entry)
import { createApp } from './app';

let app: ReturnType<typeof createApp> | null = null;

export async function bootstrap(): Promise<void> {
  // One-time init: set up stores, i18n, global config
}

export async function mount(props: QiankunProps): Promise<void> {
  // Render the app into props.container
  app = createApp(props);
  app.mount(props.container.querySelector('#root') || props.container);
}

export async function unmount(): Promise<void> {
  // Clean up: destroy app instance, clear timers, unsubscribe
  app?.unmount();
  app = null;
}

// Required for webpack/vite builds
if (!window.__POWERED_BY_QIANKUN__) {
  // Standalone dev mode
  bootstrap().then(() => {
    mount({
      container: document.getElementById('root')!,
      basename: '/',
      // ... standalone defaults
    } as unknown as QiankunProps);
  });
}
```

#### 3b. Props interface

```ts
interface QiankunProps {
  container: HTMLElement;
  basename: string;          // activeRule prefix (e.g., '/iam')
  accessToken: string;       // Supabase JWT
  supabase: SupabaseClient;  // Supabase client instance
  permissions: string[];     // user's permission codes
  locale: string;            // 'zh_CN' | 'en_US'
  theme: 'light' | 'dark';   // host theme
  http: typeof httpProxy;    // shared axios instance

  // Host state subscription
  getHostState: () => HostState;
  onHostStateChange: (listener: HostStateListener, fireImmediately?: boolean) => () => void;
}
```

#### 3c. Build config (Vite)

```ts
// vite.config.ts (sub-app template)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import qiankun from 'vite-plugin-qiankun';

export default defineConfig({
  plugins: [
    react(),
    qiankun('iam', { useDevMode: true }),
  ],
  server: {
    port: 3001,            // unique per sub-app
    cors: true,            // required for qiankun fetch
    origin: '//localhost:3001',
  },
  build: {
    lib: {
      entry: 'src/main.tsx',
      formats: ['umd'],
      name: 'iam',
      fileName: 'index',
    },
  },
});
```

Key points:
- `vite-plugin-qiankun` handles the lifecycle export wrapping and dev-mode CORS.
- UMD format is required by qiankun's HTML entry fetch.
- Each sub-app needs a **unique port** in dev mode.
- `cors: true` in dev server is required for the host to fetch the sub-app's HTML.

#### 3d. Route configuration

The sub-app must handle URL routing within its `basename`:

```tsx
// Inside the sub-app
<BrowserRouter basename={props.basename}>
  <Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/users" element={<UserList />} />
  </Routes>
</BrowserRouter>
```

The host routes are declared via the menu API — the sub-app doesn't need to know about sibling sub-apps.

#### 3e. Shared dependencies

To reduce bundle duplication, sub-apps can share common deps:

```ts
// portal-web's vite.config.ts
optimizeDeps: {
  exclude: ['iam', 'skills'],  // don't pre-bundle sub-app entries
}
```

And use `externals` in sub-apps:
```ts
// sub-app vite.config.ts
build: {
  rollupOptions: {
    external: ['react', 'react-dom', 'react-router-dom', 'zustand'],
    output: { globals: { react: 'React', 'react-dom': 'ReactDOM', ... } },
  },
}
```

---

## 4. Props Injection — Current & Future

### What portal-web currently injects

From `setupMicroApps()` in `register.ts`:

```ts
props: {
  ...cfg.props,                    // custom props from config

  http: window.__http,             // shared axios (interceptor-free proxy)

  get token() {                    // reactive getter
    return useAuthStore.getState().token;
  },
  get permissions() {              // reactive getter
    return useMenuStore.getState().permissions;
  },
  get locale() {                   // reactive getter
    return usePreferencesStore.getState().app.locale;
  },

  getHostState,                    // snapshot function
  onHostStateChange,               // subscription function

  base: cfg.activeRule,            // legacy alias
  basename: cfg.activeRule,        // for react-router basename
}
```

### Proposed additions for Supabase migration

```ts
props: {
  // --- Existing (keep) ---
  http: window.__http,
  basename: cfg.activeRule,
  getHostState,
  onHostStateChange,

  // --- Renamed (was token) ---
  get accessToken() {
    return useAuthStore.getState().session?.access_token ?? '';
  },
  // Keep for backward compat during transition:
  get token() {
    return this.accessToken;
  },

  // --- New ---
  get supabase() {
    return supabase;               // pass the Supabase client
  },
  get user() {
    return useAuthStore.getState().user;
  },
  get permissions() {
    return useMenuStore.getState().permissions;
  },
  get locale() {
    return usePreferencesStore.getState().app.locale;
  },
  get theme() {
    return useLayoutStore.getState().theme;
  },
}
```

### How sub-apps consume props

```tsx
// Inside sub-app's mount()
export async function mount(props: QiankunProps) {
  const { basename, http, accessToken, supabase, permissions } = props;

  // 1. Set up axios with the shared instance
  // (already works — http proxy has interceptor injecting token)

  // 2. Subscribe to host state changes
  props.onHostStateChange((state) => {
    // Update sub-app's local state when host changes
  });

  // 3. Create React app
  render(
    <AppContext.Provider value={{ basename, http, accessToken, supabase, permissions }}>
      <App />
    </AppContext.Provider>,
    props.container
  );
}
```

---

## 5. Sub-App Communication

### Host → Sub-app (already works)

Via qiankun props + reactive getters + `onHostStateChange`:

```ts
// Sub-app subscribes to host state
const off = props.onHostStateChange((newState, oldState) => {
  if (newState.locale !== oldState.locale) {
    i18n.changeLanguage(newState.locale);
  }
});
```

### Sub-app → Host

#### Pattern 1: Custom events (browser-native)

```ts
// Sub-app emits
window.dispatchEvent(new CustomEvent('subapp:iam:action', {
  detail: { action: 'user-created', userId: '123' }
}));

// Host listens
window.addEventListener('subapp:iam:action', handler);
```

#### Pattern 2: Global shared store (Zustand)

```ts
// packages/shared-store/index.ts (new)
import { create } from 'zustand';

export const useSharedEventBus = create<{
  events: Record<string, unknown>;
  emit: (channel: string, payload: unknown) => void;
}>((set) => ({
  events: {},
  emit: (channel, payload) => set((s) => ({
    events: { ...s.events, [channel]: payload },
  })),
}));

// Both host and sub-apps import from the same package
```

#### Pattern 3: Through the host API

The host exposes methods that sub-apps call:

```ts
// Host registers navigator
window.__hostNavigate = (path: string) => {
  // navigate within the host's router context
};

// Sub-app calls
window.__hostNavigate?.('/iam/users/123');
```

### Sub-app → Sub-app (discouraged pattern)

Direct sub-app-to-sub-app communication is generally **discouraged** in micro-frontends:

- **If needed**: Use the host as a message broker (pub/sub via custom events).
- **Better**: Each sub-app is independent. Shared state goes through the backend (API/database).
- **Example**: iam-web creates a user → POST `/api/iam/users` → skills-web refreshes its user list by querying `/api/skills/...`.

### Communication summary

| Direction | Mechanism | Use Case |
|---|---|---|
| Host → Sub-app | qiankun props + getters | Auth state, locale, theme |
| Host → Sub-app (reactive) | `onHostStateChange` | Real-time state sync (locale change, theme toggle) |
| Sub-app → Host | Custom events | Navigation requests, notifications |
| Sub-app → Sub-app | Via Host as broker, or via Backend API | Shared data (user list, permissions) |

---

## 6. Production Patterns

### Pattern from real-world qiankun setups with 5+ sub-apps

#### Configuration management

```
/api/v1/micro-apps → returns registry of enabled/configured sub-apps
Each sub-app has its own:
  - Git repository
  - CI/CD pipeline
  - Dev port (3001, 3002, 3003, ...)
  - Production deployment path (/apps/<name>/)
```

#### Environment routing

| Environment | portal-web | iam-web | skills-web |
|---|---|---|---|
| Local dev | localhost:3000 | localhost:3001 | localhost:3002 |
| Staging | staging.example.com | /apps/iam/ (same origin, CD) | /apps/skills/ |
| Production | app.example.com | /apps/iam/ | /apps/skills/ |

In production: all sub-apps are deployed to the same origin (under `/apps/<name>/`). This avoids CORS and simplifies routing. A CDN or Nginx rule maps `/apps/<name>/*` to the sub-app's static files.

#### Health checking

```ts
// Before registering, probe if the sub-app is reachable
async function probeMicroApp(entry: string): Promise<boolean> {
  try {
    const res = await fetch(entry, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

// Disable broken sub-apps silently
for (const [name, cfg] of Object.entries(allApps)) {
  if (await probeMicroApp(cfg.entry)) {
    registerApps.push(buildRegistrableApp(name, cfg));
  } else {
    console.warn(`[micro] ${name} unreachable — skipped`);
  }
}
```

#### Error boundary per sub-app

```tsx
function SubAppLayer() {
  return (
    <>
      {Object.keys(appConfig.microApps).map(name => (
        <ErrorBoundary
          key={name}
          fallback={<SubAppErrorFallback name={name} />}
          onError={(error) => {
            // Report to monitoring
            console.error(`[micro:${name}] crashed`, error);
          }}
        >
          <div id={`subapp-${name}`} />
        </ErrorBoundary>
      ))}
    </>
  );
}
```

---

## 7. Sub-App Template / Scaffold

### What a new sub-app's project structure looks like

```
apps/new-app/
├── src/
│   ├── main.tsx            # Lifecycle exports (bootstrap, mount, unmount)
│   ├── App.tsx              # Root component with BrowserRouter(basename)
│   ├── routes/
│   │   └── index.tsx        # Route definitions
│   ├── stores/
│   │   └── app-store.ts     # Sub-app-local Zustand
│   ├── pages/
│   │   └── dashboard/
│   │       └── index.tsx
│   ├── types.ts             # Props interface
│   └── vite-env.d.ts
├── public/
│   └── favicon.ico
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Template `main.tsx`

```tsx
// apps/new-app/src/main.tsx
import type { QiankunProps } from './types';
import { createApp } from './App';

let app: ReturnType<typeof createApp> | null = null;

function render(props: QiankunProps) {
  const { container, basename } = props;
  app = createApp({ ...props });
  const root = container
    ? container.querySelector('#root') || container
    : document.getElementById('root')!;
  app.mount(root);
}

export async function bootstrap(): Promise<void> {
  // One-time setup (e.g., i18n init, load preferences)
}

export async function mount(props: QiankunProps): Promise<void> {
  render(props);
}

export async function unmount(): Promise<void> {
  app?.unmount();
  app = null;
}

// Standalone dev mode
if (!(window as any).__POWERED_BY_QIANKUN__) {
  bootstrap().then(() => {
    render({
      container: document.getElementById('root')!,
      basename: '/',
      // ... standalone defaults
    } as QiankunProps);
  });
}
```

### Template `App.tsx`

```tsx
// apps/new-app/src/App.tsx
import { BrowserRouter } from 'react-router-dom';
import { createRoot, Root } from 'react-dom/client';
import type { QiankunProps } from './types';

export function createApp(props: QiankunProps) {
  let root: Root;

  const App = () => (
    <BrowserRouter basename={props.basename}>
      <AppRoutes />
    </BrowserRouter>
  );

  return {
    mount: (container: HTMLElement) => {
      root = createRoot(container);
      root.render(<App />);
    },
    unmount: () => {
      root?.unmount();
    },
  };
}
```

### Template `vite.config.ts`

```ts
// apps/new-app/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import qiankun from 'vite-plugin-qiankun';

export default defineConfig({
  plugins: [
    react(),
    qiankun('new-app', { useDevMode: true }),
  ],
  server: {
    port: 3002,     // increment for each new sub-app
    cors: true,
    origin: '//localhost:3002',
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
```

### Template `package.json`

```json
{
  "name": "@zanelab/new-app",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19",
    "react-dom": "^19",
    "react-router-dom": "^7",
    "@supabase/supabase-js": "^2",
    "vite-plugin-qiankun": "^1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4",
    "typescript": "^5",
    "vite": "^6"
  }
}
```

---

## Summary: What needs to change in portal-web

| Change | Priority | Effort |
|---|---|---|
| Remove `registered` guard — allow re-registration for dynamic apps | High | Small |
| Move micro-app config source from `window.__APP_CONFIG__` to API | High | Medium |
| Add `fetchMicroAppConfig()` API call + caching | High | Medium |
| Extend injected props (add `supabase`, `accessToken`, `theme`) | High | Small |
| Add error boundary per sub-app container | Medium | Small |
| Add health-check probe before registration | Medium | Small |
| Create a reusable sub-app template (CLI or copy-paste) | Medium | Medium |
| Document sub-app contract in a shared package (`@zanelab/micro-app-contract`) | Medium | Small |
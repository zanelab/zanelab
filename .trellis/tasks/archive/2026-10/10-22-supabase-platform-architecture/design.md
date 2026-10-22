# Design: Supabase Platform Architecture

## 1. Technical Architecture

### 1.1 Supabase Project Structure

```
┌─ Supabase Project (single) ─────────────────────────────┐
│                                                          │
│  Auth                    Kong Gateway                    │
│  ├─ users                ├─ Route: /api/iam/* → iam     │
│  ├─ sessions             ├─ Route: /api/skills/* → skills│
│  └─ JWT signing          ├─ Plugin: JWT verify           │
│                          └─ Plugin: CORS + rate-limit    │
│                                                          │
│  Database (Postgres)                                     │
│  ├─ iam schema ─ (user roles, permissions, menus)        │
│  └─ skills schema ─ (agents, workflows, tasks)           │
│                                                          │
│  Edge Functions                                          │
│  ├─ /api/iam/* → iam-server endpoints                   │
│  └─ /api/skills/* → skills-server endpoints             │
└──────────────────────────────────────────────────────────┘
```

**Key design decisions:**
- One Supabase project hosts both services under different schemas. Auth is shared.
- Backend logic implemented as Supabase Edge Functions (Deno runtime), not separate servers.
- Kong routes configured via Supabase dashboard or `config.toml`. Path-based routing: `/api/iam/*` → Edge Functions group A, `/api/skills/*` → Edge Functions group B.
- JWT verification at Kong level: Kong validates the Supabase JWT signature before forwarding to Edge Functions. The `sub` claim identifies the user; `app_metadata` and `user_metadata` carry roles.

### 1.2 Frontend Auth Flow

```
Login Page
  → supabase.auth.signInWithPassword({ email, password })
    → PKCE flow (built-in)
      → Session stored in localStorage (supabase-js manages this)
        → onAuthStateChange fires
          → Zustand authStore updated: { session, user, isInitialized: true }
            → RouteGuard unblocks
              → bootstrapSession(): fetch menus, permissions, setup micro-apps

Page Refresh
  → supabase.auth.getSession() (reads from localStorage, ~1ms)
    → Session restored → authStore updated → isInitialized: true
      → If valid: restore menus/permissions from cache or API
      → If expired: RouteGuard redirects to login
```

**Auth Store redesign:**

```typescript
interface AuthState {
  session: Session | null;      // Supabase session (access_token, refresh_token, expires_at)
  user: User | null;            // Supabase user (id, email, user_metadata)
  isInitialized: boolean;       // true after getSession() completes
}

// Actions
setSession(session: Session | null)
setUser(user: User | null)
reset()                         // clear on signOut
```

**Token format change:**
- Before: Custom `ailab-token` header with opaque token string
- After: `Authorization: Bearer <supabase_jwt>` header

**Axios interceptor (simplified):**
```typescript
service.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    config.headers.set('Authorization', `Bearer ${data.session.access_token}`);
  }
  return config;
});

// Remove: custom refresh queue, SM4 encryption, legacy session headers
// Keep: response interceptor for biz error code handling (10001, 10002, etc.)
```

**Removed complexity:**
- `isRefreshing` / `refreshSubscribers` queue → Supabase handles this natively
- `buildLegacyHeaders()` / session-headers.ts → no longer needed
- SM4 crypto (`crypto.ts`) → Supabase uses bcrypt server-side
- `LEGACY_TOKEN_KEY` / `cache.set('TOKEN', ...)` → managed by supabase-js
- Custom refresh endpoint (`/sys/auth/refresh`) → Supabase `_refresh` endpoint

**401 handling (simplified):**
```typescript
service.interceptors.response.use(undefined, async (error) => {
  if (error.response?.status === 401) {
    // Supabase session already invalid — just sign out
    await supabase.auth.signOut();
    window.location.replace(appConfig.auth.loginPath);
  }
  return Promise.reject(error);
});
```

### 1.3 Sub-App Registration Contract

**Config structure (standardized):**

```typescript
interface MicroAppConfig {
  name: string;          // unique app identifier, e.g. 'iam-web'
  entry: string;         // dev server URL or production asset path
  container: string;     // DOM selector, e.g. '#subapp-iam-web'
  activeRule: string;    // route prefix, e.g. '/iam'
  prefetch?: boolean;    // preload on host idle (default: false)
  props?: Record<string, unknown>;  // app-specific extra props
}
```

**New sub-app 3-step registration:**

1. **Config**: Add entry to `config.js` → `window.__APP_CONFIG__.microApps`
2. **Menu**: Add menu item in Supabase `iam.menus` table with path matching `activeRule`
3. **Sub-app**: Create project from template, implement lifecycle exports

**Sub-app template contract (`main.tsx`):**
```typescript
// Required exports for vite-plugin-qiankun
export async function bootstrap() {}
export async function mount(props: QiankunProps) {
  render(<App {...props} />, props.container);
}
export async function unmount(props: QiankunProps) {
  // cleanup
}
export async function update(props: QiankunProps) {
  // hot-update props
}
```

**Standardized props interface:**
```typescript
interface QiankunProps {
  container: HTMLElement;
  accessToken: string;       // Supabase JWT (renamed from 'token')
  permissions: string[];     // permission codes
  basename: string;          // React Router basename
  http: AxiosInstance;       // pre-configured HTTP client
  user: User | null;         // Supabase user object
  locale: string;            // current locale
  getHostState(): HostState;
  onHostStateChange(cb, fireImmediately?): () => void;
}
```

### 1.4 Configuration Architecture

**`window.__APP_CONFIG__` additions:**

```javascript
window.__APP_CONFIG__ = {
  // existing...
  supabase: {
    url: 'https://xxxxx.supabase.co',
    anonKey: 'eyJhbGciOi...',
  },
  auth: {
    loginPath: '/login',
    // REMOVED: tokenKey, refreshTokenKey (managed by supabase-js)
  },
  microApps: {
    'iam-web': {
      name: 'iam-web',
      entry: '//localhost:8081/',
      container: '#subapp-iam-web',
      activeRule: '/iam',
      prefetch: true,
    },
    // new app:
    // 'skills-web': { ... }
  },
  api: {
    baseURL: 'https://xxxxx.supabase.co',
    gatewayPrefix: '/api',
    // REMOVED: refreshEndpoint (handled by supabase-js)
  },
};
```

## 2. Data Flow

### 2.1 Login Flow

```
User → Login Form → supabase.auth.signInWithPassword()
  → POST https://xxxxx.supabase.co/auth/v1/token?grant_type=password
    → Supabase Auth: validate email/password
      → Return: { access_token, refresh_token, expires_in, user }
        → supabase-js stores session in localStorage
          → onAuthStateChange → update Zustand authStore
            → RouteGuard sees isInitialized=true, session exists → renders app
              → App.tsx: bootstrapSession()
                → GET /api/iam/menus (through Kong → Edge Function)
                  → Kong verifies JWT, forwards to iam Edge Function
                    → Edge Function reads user from JWT, queries menus table
                      → Returns menu tree
                → Store menus in Zustand menuStore
                → setupMicroApps() from config
```

### 2.2 API Request Flow (post-migration)

```
Sub-app Component → http.get('/api/iam/users')
  → Axios request interceptor:
      supabase.auth.getSession() → access_token
      config.headers.Authorization = `Bearer ${access_token}`
    → HTTP request to https://xxxxx.supabase.co/api/iam/users
      → Kong Gateway:
          1. CORS preflight (if needed)
          2. Rate limit check
          3. JWT signature verification (against Supabase JWKS)
          4. Path match: /api/iam/* → iam Edge Functions
          5. Forward request with X-User-Id header (from JWT sub claim)
        → iam Edge Function:
          Receives user identity from X-User-Id
          Executes business logic
          Returns JSON response
```

### 2.3 Sub-App Communication

```
Host → Sub-app: Props injection (accessToken, permissions, basename, http)
Sub-app → Host: Custom events for app-level notifications
  e.g. window.dispatchEvent(new CustomEvent('subapp:navigate', { detail: { path } }))
  e.g. window.dispatchEvent(new CustomEvent('subapp:logout'))
Sub-app → Sub-app: Via host as broker (no direct communication)
```

## 3. Migration Strategy

### 3.1 Phased Rollout

**Phase 1 (this task): Supabase Auth integration + config standardization**
- Set up Supabase project with Auth, schemas, Kong routes
- Migrate portal-web auth to Supabase
- Standardize sub-app registration
- Verify iam-web still works with new props

**Phase 2 (future task): Backend services**
- Implement iam-server Edge Functions (users, roles, permissions, menus)
- Implement skills-server Edge Functions
- Migrate existing custom backend APIs to Edge Functions

### 3.2 Rollback Safety

- Config-driven: switching between old auth and Supabase Auth is controlled via `window.__APP_CONFIG__`
- Feature flag: `auth.provider: 'supabase' | 'legacy'` allows reverting without code changes
- The old `http.ts` interceptor and `auth-store.ts` can coexist in a single build if needed

### 3.3 Data Migration

- User accounts need to be recreated in Supabase Auth
- Existing menu/permission data migrates to Supabase `iam` schema tables
- No backward compatibility for existing password hashes (SM4 → bcrypt)

## 4. Trade-offs

| Decision | Pros | Cons |
|----------|------|------|
| Edge Functions vs dedicated servers | Zero ops, scales with Supabase, built-in JWT | Deno runtime limits, cold starts, no long-lived connections |
| Shared Supabase project | Simple, one JWT issuer, one dashboard | Coupling risk, single point of failure |
| Config-driven sub-apps | Simple, no extra infrastructure | Adding apps requires config deploy (not runtime) |
| Supabase cloud dev | No Docker, instant setup | Network dependency, shared dev instance |

## 5. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Edge Function cold starts | Medium | UX latency | Warm-up calls, optimize bundle size |
| Auth migration breaks existing users | Medium | Critical | Phased rollout, feature flag |
| Kong route misconfiguration | Low | High | Test Kong config via dashboard before deploy |
| supabase-js session expiry edge case | Low | Medium | The existing Axios 401 interceptor catches this, redirects to login |
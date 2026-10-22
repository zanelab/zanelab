# Supabase Auth in React SPA

> Research on integrating Supabase Auth into portal-web (React 19 SPA, no SSR).
> Written 2026-10-22 for task `supabase-platform-architecture`.

---

## 1. @supabase/ssr vs @supabase/auth-ui-react vs @supabase/supabase-js

### Which package for a React 19 SPA?

| Package | Purpose | For portal-web? |
|---|---|---|
| `@supabase/supabase-js` | Core JS client. Works everywhere (browser, Node). | **YES — core dependency** |
| `@supabase/ssr` | Server-side rendering helpers. Provides `createServerClient` and `createBrowserClient` for Next.js/Remix/SvelteKit. | **NO — portal-web is SPA, no SSR** |
| `@supabase/auth-ui-react` | Pre-built auth UI components (login/signup/password reset forms). Built on `@supabase/auth-ui-shared`. | **Optional** — can use it for quick setup, or build custom forms with `supabase-js` |
| `@supabase/auth-helpers-react` | **DEPRECATED** (since 2024). Was the React SPA helper before. Supabase now recommends `@supabase/supabase-js` with manual session management. | **NO — deprecated** |

### Recommendation for portal-web

**Primary: `@supabase/supabase-js`** + a thin Zustand integration layer.

```ts
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { appConfig } from '../config';

export const supabase = createClient(
  appConfig.auth.supabaseUrl,
  appConfig.auth.supabaseAnonKey,
);
```

**Optional: `@supabase/auth-ui-react`** if you want Supabase's pre-built login/register forms as a starting point. But the portal-web already has custom forms (`AuthenticationLogin`, `CodeLogin`, `QrCodeLogin`) — it's likely better to adapt those to call `supabase.auth.signInWithPassword()` rather than adopting auth-ui-react wholesale.

### Trade-offs summary

| Approach | Pros | Cons |
|---|---|---|
| `@supabase/supabase-js` only | Lightweight, full control, integrates with existing Zustand | Must build auth UI and session management manually |
| `@supabase/auth-ui-react` | Quick setup, handles auth edge cases, accessible | Heavy dependency, limited customization, may conflict with existing design system |
| `@supabase/ssr` | — | Wrong tool for SPA; creates complexity with no benefit |

---

## 2. Auth Flow in a SPA

### Supabase PKCE Flow

Supabase Auth uses **PKCE (Proof Key for Code Exchange)** by default for SPAs. The flow:

```
1. User submits email + password
2. Client → Supabase Auth: signInWithPassword({ email, password })
3. Supabase returns: { data: { session, user }, error }
4. Session stored in localStorage automatically (key: sb-<ref>-auth-token)
5. `onAuthStateChange` listener fires → update Zustand store
6. All subsequent API calls use the session's access_token as Bearer token
```

### Session storage (no cookies in SPA)

Supabase stores the session in **localStorage** by default. For SPAs:
- **localStorage is the recommended approach** for Supabase Auth in SPAs (not cookies).
- The session object includes:
  ```ts
  {
    access_token: string,   // JWT, ~1 hour expiry
    refresh_token: string,  // used to get new access_token
    expires_at: number,     // Unix timestamp
    expires_in: number,     // seconds until expiry
    token_type: "bearer",
    user: {                 // Supabase User object
      id, email, phone, app_metadata, user_metadata, ...
    }
  }
  ```

### How to manage the session in Zustand

```ts
// stores/auth-store.ts (refactored)
import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthStore {
  session: Session | null;
  user: User | null;
  isInitialized: boolean;   // true after first getSession()

  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  session: null,
  user: null,
  isInitialized: false,

  setSession: (session) => set({ session, user: session?.user ?? null }),

  signOut: async () => {
    await supabase.auth.signOut();
    // store cleared by onAuthStateChange listener below
  },
}));

// Initialize once at app boot
supabase.auth.getSession().then(({ data: { session } }) => {
  useAuthStore.getState().setSession(session);
  useAuthStore.setState({ isInitialized: true });
});

// Listen for all auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  useAuthStore.getState().setSession(session);

  if (event === 'SIGNED_OUT') {
    // Clear app-specific caches (menus, tenant headers, etc.)
  }
});
```

---

## 3. JWT Handling

### Getting the access token

```ts
// Synchronously from Zustand (after initialization)
const token = useAuthStore.getState().session?.access_token;

// Or async from Supabase SDK
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

### Token refresh

**Supabase handles this automatically.** The SDK:
1. Detects when `access_token` is about to expire (or has expired based on `expires_at`).
2. Uses `refresh_token` to get a new `access_token`.
3. Fires `onAuthStateChange` with `TOKEN_REFRESHED` event.
4. Updates localStorage automatically.

**The existing custom refresh logic in `http.ts` (the queue pattern) can be removed.** The Supabase SDK replaces it.

### What the axios interceptor should look like after migration

```ts
service.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }

  // Keep legacy multi-tenant headers
  const legacyHeaders = buildLegacyHeaders();
  for (const [key, value] of Object.entries(legacyHeaders)) {
    config.headers.set(key, value);
  }
  return config;
});
```

Note: `supabase.auth.getSession()` is fast (reads from localStorage cache), so calling it in every request interceptor is acceptable. Alternatively, use `useAuthStore.getState().session?.access_token` for zero-overhead synchronous access after initialization.

### Handling token expiry in the response interceptor

```ts
service.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Supabase has likely already refreshed the token.
      // Try getting the current session and retry.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        error.config.headers.Authorization = `Bearer ${session.access_token}`;
        return service(error.config); // retry once
      }
      // No session → force logout
      useAuthStore.getState().signOut();
    }
    return Promise.reject(error);
  }
);
```

---

## 4. Integration with Existing Zustand Stores

### How portal-web currently bridges auth to Zustand

Currently, `auth-store.ts` is a standalone Zustand store. Other stores and components consume it via:
- `useAuthStore((s) => s.token)` — reactive in components
- `useAuthStore.getState().token` — imperative in non-hook code (axios interceptor, register.ts)

### Migration strategy

1. **Extend auth-store** to hold `session` + `user` instead of `token` + `refreshToken`.
2. **Add a derived `token` getter** for backward compatibility during transition:
   ```ts
   // Temporary bridge — remove after all consumers migrated
   get token() {
     return this.session?.access_token ?? '';
   }
   ```
3. **Sub-apps via qiankun props** currently receive `token` as a getter. After migration, they receive `accessToken` (or the full session):
   ```ts
   props: {
     get accessToken() {
       return useAuthStore.getState().session?.access_token;
     },
     get supabase() {
       return supabase;  // pass the client instance
     },
   }
   ```
4. **Other stores** (menu-store, session-store, preferences-store) are **unchanged** — they don't store auth data; they only clear on logout.

---

## 5. Protected Routes with React Router 7 + Supabase Auth

### What portal-web has now

`RouteGuard.tsx` wraps `LayoutShell`:
```tsx
if (!token) → redirect /login?from=/current
if (no permission) → redirect /403
```

### What changes

```tsx
export function RouteGuard({ children }: RouteGuardProps) {
  const session = useAuthStore((s) => s.session);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const permissions = useMenuStore((s) => s.permissions);
  const menus = useMenuStore((s) => s.menus);
  const location = useLocation();

  // Wait for Supabase session initialization
  if (!isInitialized) {
    return <Loading />;  // or a skeleton
  }

  if (!session) {
    // Same redirect logic as before
    const loginPath = appConfig.auth.loginPath;
    if (location.pathname === loginPath) return <Navigate to={loginPath} replace />;
    const from = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${loginPath}?from=${from}`} replace />;
  }

  // Permission check — unchanged
  const menu = findMenuByPath(menus, location.pathname);
  const permission = (menu as { permission?: string } | undefined)?.permission;
  if (permission && !permissions.includes(permission)) {
    return <Navigate to={appConfig.route.forbiddenPath} replace />;
  }

  return <>{children ?? <Outlet />}</>;
}
```

### Key difference: `isInitialized` flag

The async nature of `supabase.auth.getSession()` means there's a brief moment where the session is unknown. The guard must:
1. Show a loading state while `isInitialized === false`.
2. Then check `session`.
3. Otherwise, there's a flash where the user sees the login page briefly before session is restored.

### Session lifecycle in App.tsx

```tsx
// In App.tsx or a top-level AuthProvider
useEffect(() => {
  // Restore session on mount
  supabase.auth.getSession().then(({ data: { session } }) => {
    useAuthStore.getState().setSession(session);
    useAuthStore.setState({ isInitialized: true });

    if (session) {
      // Fetch userPer, menus (same as current bootstrapSession)
      initializeAppData();
    }
  });

  // Listen for changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      useAuthStore.getState().setSession(session);
      if (session) {
        initializeAppData();
      }
    }
  );

  return () => subscription.unsubscribe();
}, []);
```

---

## 6. Known Issues When Migrating from Custom Token Auth to Supabase Auth

### Issue 1: Token format mismatch
- **Current**: raw opaque token string in `ailab-token` header.
- **Supabase**: JWT in `Authorization: Bearer <jwt>` header.
- **Impact**: All backend APIs must be updated to validate Supabase JWTs instead of the legacy token. Kong gateway must be configured to verify Supabase JWT signatures.

### Issue 2: User identity mismatch
- **Current**: Login returns `{ token, userId, name, email, phone }`. User ID is a number from the legacy system.
- **Supabase**: User ID is a UUID (e.g., `d7b2f8a1-...`). User metadata is in `user_metadata` and `app_metadata`.
- **Impact**: Backend APIs that reference `userId` by numeric ID must be migrated. Supabase's `auth.users` table uses UUIDs. Custom tables referencing `user_id` must change from `integer` to `uuid`.

### Issue 3: Backend token validation
- **Current**: Backend validates the `ailab-token` header (likely against a session store).
- **Supabase**: Backend must validate the JWT using Supabase's JWKS endpoint or the `supabase-js` server library.
- **Impact**: All backend services (iam-server, skills-server, any existing services) must add JWT validation middleware. Kong gateway can handle this centrally.

### Issue 4: Sub-app token propagation
- **Current**: Sub-apps receive `token` via qiankun props. They use the same `ailab-token` header for their own API calls.
- **Supabase**: Sub-apps receive `accessToken` via qiankun props. They must use `Authorization: Bearer` header. If they use their own axios instance, they need to read the token from props.
- **Impact**: Each sub-app must update its HTTP client. Or better: sub-apps should use the shared `http` proxy from `window.__http` (which already works in the current setup).

### Issue 5: Session restoration race condition
- **Current**: No proactive restoration (see analysis above). The existing system is broken on refresh — the refresh-token-based lazy restore is unreliable.
- **Supabase**: `getSession()` is fast and synchronous from localStorage. But there's still a ~50ms initialization window.
- **Mitigation**: Set `isInitialized: false` in the store and block rendering until `getSession()` resolves.

### Issue 6: Multi-tab logout
- **Current**: `global-logout` custom event only works within the same tab.
- **Supabase**: `onAuthStateChange` fires in ALL tabs when session changes (Supabase uses `localStorage` events under the hood). This is built-in and better.

### Issue 7: Sub-apps using their own Supabase clients
- If a sub-app needs to make Supabase API calls directly (e.g., querying its own Supabase project), it can create its own `supabase` client with the **same** project URL and anon key.
- The shared session in localStorage means the sub-app automatically gets the same auth state.
- Alternatively, pass the `supabase` client through qiankun props.

### Issue 8: Remember-me functionality
- **Current**: Stores username + password in localStorage (plaintext!) under `REMEMBER_ME_USERNAME_<hostname>`.
- **Supabase**: Supabase session persists across tabs/refreshes automatically. The "remember me" concept is built-in — the session stays until `signOut()` is called or the refresh token expires.
- **Impact**: Remove the local `REMEMBER_ME_*` keys. Supabase handles persistence.

### Issue 9: Email vs Username login
- **Current**: Login form has a `username` field. Backend uses `email` (username + emailSuffix).
- **Supabase**: `signInWithPassword` uses `email` by default. For username login, you'd need a custom `users` table lookup or use Supabase's `phone` auth.
- **Impact**: Change the login form label from "username" to "email", or implement a custom flow that maps username → email via a backend lookup.

### Issue 10: Password encryption (SM4)
- **Current**: Client-side SM4 encryption of password before sending.
- **Supabase**: Send raw password over HTTPS. Supabase hashes it server-side.
- **Impact**: Remove `sm-crypto` dependency. Simplify login flow.
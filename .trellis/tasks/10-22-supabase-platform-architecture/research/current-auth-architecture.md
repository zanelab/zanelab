# Current Auth Architecture Analysis

> Full audit of portal-web's existing auth code, state management, and login flow.
> Written 2026-10-22 for task `supabase-platform-architecture`.

---

## 1. auth-store.ts — State Management

**File**: `apps/portal-web/src/stores/auth-store.ts`

### State shape
```ts
interface AuthState {
  token: string;
  refreshToken?: string;
  user: UserInfo | null;
}
```

- `token` — a raw string stored in-memory via Zustand. No JWT parsing or expiry-tracking.
- `refreshToken` — optional string, stored but never used directly from the store; the refresh logic in `http.ts` reads it from `localStorage`.
- `user` — nullable `UserInfo` with only `id`, `username`, `nickname?`, `avatar?`.

### Actions
| Action | Behavior |
|---|---|
| `setToken(token)` | Replaces token in state |
| `setAuth({token, refreshToken?, user?})` | Atomically sets token + optional refreshToken + user (null if omitted) |
| `setUser(user)` | Replaces user object |
| `logout()` | Resets all three fields to initial empty state |

### What works well
- Simple, Zustand-native. No deps on React context (usable outside components via `getState()`).
- Works with axios interceptors (no hook rules issues).

### What must change for Supabase Auth
- **Token → session**: Supabase manages the session object (access_token, refresh_token, expires_at, user). The store must track a `Session | null` instead of bare `token`.
- **No manual setToken**: Supabase SDK's `onAuthStateChange` listener should drive store updates; no code should call `setToken` directly.
- **User shape richer**: Supabase `User` has `id`, `email`, `phone`, `app_metadata`, `user_metadata`, `created_at`, etc. Need to map this to portal-web's `UserInfo` or extend it.
- **Logout → `supabase.auth.signOut()`**: Must call Supabase signOut + clear local state.

---

## 2. src/utils/http.ts — Axios Interceptor & Token Refresh

**File**: `apps/portal-web/src/utils/http.ts`

### Architecture

```
Request Interceptor → Response Interceptor (success) → Response Interceptor (error/401)
```

### Request interceptor (lines 90-101)
- Reads token from `useAuthStore.getState().token` **at request time** (not subscription-based).
- Injects token as header `ailab-token` (`TOKEN_HEADER`).
- Also calls `buildLegacyHeaders()` for multi-tenant headers (`X-Platform`, `X-Tenant`, etc.).

### Response interceptor — success (lines 142-169)
- Expects `ApiEnvelope<T>` shape: `{ code, data, msg?, message?, success? }`.
- Success codes: `0`, `'0'`, `'10000'` → unwrapped to `data`.
- Re-login codes: `'213004'`, `'40100'`, `'213005'` → triggers `handleLogout()` + redirect.
- Also detects session-expired messages via regex: `/未登录|登录已失效|...|session expired/i`.

### Response interceptor — error/401 (lines 171-229)
- **401 handling**: Implements a token-refresh queue pattern:
  ```ts
  let isRefreshing = false;
  let refreshSubscribers: ((token: string) => void)[] = [];
  ```
  - First 401 request: sets `_retry` flag, calls `/sys/auth/refresh` endpoint with `refreshToken` from localStorage.
  - Concurrent 401 requests: subscribe to a callback; when refresh completes, replay all queued requests with the new token.
  - Refresh failure: triggers `handleLogout()`.
- **403**: shows "forbidden" toast.
- **500+**: shows "server error" toast.

### What works well
- The token-refresh queue pattern is solid and will work with Supabase JWT refresh with minimal changes.
- `window.__http` proxy hides interceptors from qiankun sub-apps (preventing double-interception).

### What must change for Supabase Auth
- **Token header**: Change from `ailab-token` to `Authorization: Bearer <jwt>`.
- **Token refresh**: Replace the custom `/sys/auth/refresh` call with `supabase.auth.getSession()` or Supabase's automatic refresh. Supabase SDK already handles token refresh — the interceptor should rely on the SDK rather than rolling its own.
- **Session-expired detection**: Supabase errors have their own shape; need to detect Supabase-specific error codes instead of the legacy `213004`/`40100`.
- **axios `withCredentials`**: Currently `true`. Supabase default is authorization header, not cookie. Keep `withCredentials: false` unless using cookie-based auth (not recommended for SPA).
- **Multi-tenant headers** (`X-Platform`, `X-Tenant`, etc.): These are **not** Supabase-native and must be preserved. They can remain as custom headers alongside the Supabase Authorization header.

---

## 3. src/utils/auth.ts — Token & Session Utilities

**File**: `apps/portal-web/src/utils/auth.ts`

### Functions

| Function | Purpose |
|---|---|
| `clearStoredTokens()` | Removes `portal_token`, `portal_refresh_token` from localStorage; also clears legacy cache keys (`AILab-Token`, `UserInfo`, `TENANT_MAP`, `PowerAgent`, and all X- headers) |
| `handleLogout()` | Calls `clearStoredTokens()` + resets auth/menu/session Zustand stores + dispatches `global-logout` custom event (for iframe/legacy integrations) |

### Token storage mechanism
- **localStorage**: `appConfig.auth.tokenKey` (`portal_token`) and `appConfig.auth.refreshTokenKey` (`portal_refresh_token`).
- **cache** (in-memory Map): `AILab-Token` (legacy key), session headers (`X-Platform`, `X-Tenant`, etc.).

### What works well
- `handleLogout()` is comprehensive — clears stores, cache, and localStorage atomically.
- `global-logout` custom event is listened by `App.tsx` to redirect to login.

### What must change for Supabase Auth
- `clearStoredTokens()`: Supabase stores session in localStorage under `sb-<project-ref>-auth-token`. This is managed by the SDK — don't remove manually, use `supabase.auth.signOut()`.
- `handleLogout()`: Must call `supabase.auth.signOut()` before clearing custom keys. The Supabase listener (`onAuthStateChange`) will detect the sign-out and clear state automatically.
- Token key: Remove `portal_token` and `portal_refresh_token` from localStorage — replaced by Supabase-managed keys.

---

## 4. src/utils/crypto.ts — SM4 Encryption

**File**: `apps/portal-web/src/utils/crypto.ts`

```ts
export function encryptPassword(password: string): string {
  const trimmed = password.trim();
  if (appConfig.auth.loginWithSm4 && appConfig.auth.sm4Key) {
    return sm4.encrypt(trimmed, appConfig.auth.sm4Key, { mode: 'ECB' });
  }
  return btoa(trimmed);
}
```

### Current usage
- Called in `authApi.login()` → password is encrypted client-side before sending to the backend login endpoint.
- Default config has `loginWithSm4: false` — so fallback `btoa()` is used.

### With Supabase Auth
- **SM4 encryption is NOT needed**. Supabase Auth handles password hashing server-side (bcrypt/scrypt). The client sends the raw password over HTTPS.
- The `sm-crypto` package and `encryptPassword` can be removed entirely.
- `btoa()` fallback is also not needed — Supabase's `signInWithPassword()` handles transport security.

---

## 5. src/api/auth.ts — Login/Logout API Calls

**File**: `apps/portal-web/src/api/auth.ts`

### Current API shape

#### Login
```ts
POST /sys/auth/login
Body: {
  loginChanel: "passport",
  email: "username@suffix",
  password: "<SM4-encrypted or base64>"
}
Response: { token: string, userId: number, name: string, email: string, phone: string }
```

#### Logout
```ts
POST /sys/auth/logout
Headers: { "ailab-token": token }
```

#### Change Password
```ts
PUT /sys/auth/user/{userId}/change/pwd
Body: { oldPassword, newPassword, confirmPassword }
```

#### Other APIs
- `sendOtpEmail(email)` — `POST /sys/auth/otp`
- `getUserPer()` — `GET /home/user/getUserPer` (tenant/org permissions)
- `findPowerAgent()` — `GET /share/findPowerAgent` (via agentBaseURL)

### What must change for Supabase Auth
- **Login**: Replace with `supabase.auth.signInWithPassword({ email, password })`. Supabase `signInWithPassword` uses the `email` field (not `username`). The legacy `loginChanel: "passport"` and `emailSuffix` pattern goes away.
- **Logout**: Replace with `supabase.auth.signOut()`.
- **Change Password**: Replace with `supabase.auth.updateUser({ password })`. If the old password check is needed, re-authenticate first with `supabase.auth.reauthenticate()`.
- **getUserPer()**: This is a **custom backend API**, not Supabase Auth. It fetches tenant/org permissions. After migration, this call should be made AFTER Supabase auth is established, using the Supabase JWT for authorization.
- **findPowerAgent()**: Same — custom API, must use Supabase JWT after migration.

---

## 6. src/config/ — Auth Configuration

**File**: `apps/portal-web/src/config/index.ts`

### Current auth config shape
```ts
auth: {
  loginPath: '/login',
  tokenKey: 'portal_token',
  refreshTokenKey: 'portal_refresh_token',
  loginChannel: 'passport',
  loginWithSm4: false,
  sm4Key: undefined,
  emailSuffix: '',
  loginOptions: {
    showCodeLogin, showQrcodeLogin, showThirdPartyLogin,
    showRegister, showForgetPassword, showRememberMe,
    showColorToggle, showLayoutToggle,
  },
}
```

### What changes for Supabase Auth
```ts
auth: {
  // Supabase project URL and anon key (public, safe in frontend)
  supabaseUrl: string;
  supabaseAnonKey: string;
  // Keep existing:
  loginPath: '/login',
  // Remove:
  // tokenKey, refreshTokenKey, loginChannel, loginWithSm4, sm4Key, emailSuffix
  // Simplify loginOptions (Supabase Auth UI has its own options)
  loginOptions: { ... }  // still useful for password/code/qrcode tabs
}
```

### Config injection
- Currently loaded via `window.__APP_CONFIG__` injected at deploy time.
- Supabase URL + anonKey are the same pattern — inject via `__APP_CONFIG__` (env-specific per deployment).
- For local dev, these can come from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` env vars.

---

## 7. RouteGuard.tsx — Route Protection

**File**: `apps/portal-web/src/components/RouteGuard.tsx`

### Current logic
```tsx
if (!token) → redirect to loginPath + ?from=currentPath
if (menuPermission required && !has permission) → redirect to /403
else → render children / Outlet
```

### What stays the same
- Token existence check (just check session instead of token).
- Permission check from menu store (unchanged — permissions still come from backend API).
- from= redirect pattern (preserves deep-linking after login).

### What changes
- Token check → session check: `const session = useAuthStore(s => s.session); if (!session) redirect`.
- Supabase provides `supabase.auth.getSession()` which is async; the guard may need a loading state while session initializes.

---

## 8. Login Flow — Complete Trace

### Current flow

```
1. User visits /login?from=/target-page
2. LoginPage renders AuthenticationLogin form
3. User submits username + password
4. authApi.login() → POST /sys/auth/login
   - password is SM4-encrypted (or base64)
   - emailSuffix appended to username
   - body: { loginChanel, email, password }
5. Response: { token, userId, name, email, phone }
6. bootstrapSession(token, refreshToken?, user)
   - stores token in localStorage (portal_token)
   - stores in Zustand auth-store
   - stores in cache (legacy AILab-Token, UserInfo)
   - fetches userPer → tenant/org selection → cache headers
   - fetches menus → Zustand menu-store
   - calls setupMicroApps()
7. on success → navigate to from= target or first menu path or /dashboard
```

### Session restoration (page refresh)

```
1. App.tsx mounts, useAuthStore.token is '' (empty)
2. No explicit restore on mount — token is lost unless persisted...
   Wait — where is the restoration?

Looking at App.tsx more carefully:
- There is NO explicit session restoration from localStorage on mount!
- The token only exists in-memory in Zustand (dies on page refresh)
- BUT: the axios interceptor reads from useAuthStore.getState().token at request-time
- After a page refresh, token is empty, first API call will 401
- The 401 interceptor THEN reads refreshToken from localStorage → calls /sys/auth/refresh
- This is the "lazy restore" pattern: session is not restored at boot, only on first 401

Wait, let me re-check. Is there a `restoreSession` somewhere?

Yes! `restoreSession` in `register.ts` line 104. Let me trace where it's called...
It's NOT called from App.tsx or LoginPage. It's likely called by the session-store or a separate boot flow.

Let me check App.tsx again... No, only `watchGlobalLogout` is set up. No restoration call.

Actually wait - looking at the auth store initial state: `token: ''`. And there's no `restoreSession` called anywhere visible in App.tsx. This is important — it means:

**Token persistence is reload-based**: After page refresh, the token is empty in Zustand. The axios interceptor's refresh mechanism handles recovery when the first API call 401s. But if the user lands on a protected route, RouteGuard sees no token → redirects to login.

This is a **known gap** in the current implementation: session restoration after page refresh is unreliable. The refresh-token flow in the interceptor is reactive (only triggered by a 401 response), not proactive.
```

### Session restoration (actual behavior on page refresh)
- Zustand is in-memory only → `token` is `''` after refresh.
- localStorage has `portal_token` and `portal_refresh_token`.
- BUT: there's no code that reads `portal_token` from localStorage and calls `setToken()` on app mount.
- RouteGuard sees empty token → redirects to login immediately.
- The only recovery path is if the user lands on a public page (like `/auth/*`) and then navigates to a protected route — but token is still empty, so RouteGuard still blocks.

**This is effectively broken post-refresh without the token-restore call that used to exist.**

Actually, let me re-read register.ts. There IS a `restoreSession` function but it's not wired up to any component lifecycle in App.tsx.

### What Supabase Auth fixes
- `supabase.auth.getSession()` is called on mount → returns session or null.
- `supabase.auth.onAuthStateChange` listener fires whenever session state changes (login, logout, token refresh).
- Session is persisted to localStorage by the SDK automatically.
- On page refresh, `getSession()` reads from localStorage and restores the session synchronously.
- **This eliminates all the lazy-restore complexity**.

---

## Summary: Change Impact Matrix

| Component | Keep | Modify | Remove | Replace With |
|---|---|---|---|---|
| `auth-store.ts` | Zustand pattern, `getState()` access | State shape (token → session) | `setToken`, `setAuth` (manual writes) | `onAuthStateChange`-driven updates |
| `http.ts` | Queue-based refresh pattern, proxy export | Token header (`ailab-token` → `Bearer`), refresh logic | Custom `/sys/auth/refresh` call, 213004/40100 error codes | Supabase SDK token refresh, Supabase error handling |
| `auth.ts` | `handleLogout()` multi-store reset pattern | Clear flow | `clearStoredTokens()` raw localStorage manipulation | `supabase.auth.signOut()` + custom key cleanup |
| `crypto.ts` | — | — | **Entire file** | Supabase handles password security server-side |
| `api/auth.ts` | Structure (object with methods) | `getUserPer()`, `findPowerAgent()` (keep, but use Supabase JWT) | `login()`, `logout()`, `changePassword()`, `sendOtpEmail()` | Supabase SDK methods |
| `config/index.ts` | Config injection pattern (`window.__APP_CONFIG__`) | Auth config shape | `loginChannel`, `loginWithSm4`, `sm4Key`, `emailSuffix` | `supabaseUrl`, `supabaseAnonKey` |
| `RouteGuard.tsx` | Permission check, from= redirect | Token check → session check, add loading state | — | — |
| `login/index.tsx` | Deep-link redirect, menu navigation | Login form → Supabase Auth UI or custom Supabase login | `bootstrapSession()` | `supabase.auth.signInWithPassword()` + then fetch userPer/menus |
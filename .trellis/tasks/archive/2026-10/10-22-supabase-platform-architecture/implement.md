# Implementation Plan: Supabase Platform Architecture

## Execution Order

### Step 1: Supabase Project Setup (prerequisite)
**Deliverable**: Working Supabase project with Auth, schemas, and Kong routes
- [ ] Create Supabase cloud project (free tier)
- [ ] Configure Auth provider: email/password
- [ ] Create database schemas: `iam`, `skills`
- [ ] Create seed tables: `iam.menus`, `iam.permissions`, `iam.roles`
- [ ] Configure Kong routes: `/api/iam/*`, `/api/skills/*`
- [ ] Verify JWT validation works: `curl` with test token
- **Validate**: `curl -H "Authorization: Bearer <JWT>" https://xxxxx.supabase.co/api/iam/test` returns 200

### Step 2: Portal-web Supabase Client
**Deliverable**: Supabase client initialized and accessible to all modules
- [ ] Add `@supabase/supabase-js` dependency to portal-web
- [ ] Create `src/lib/supabase.ts` — singleton `supabase` client
- [ ] Add `supabase.url` and `supabase.anonKey` to `appConfig`
- [ ] Create `src/hooks/useSupabase.ts` — React context wrapper (optional, for non-store access)
- **Validate**: `console.log(supabase)` works in browser devtools

### Step 3: Auth Store Migration
**Deliverable**: Zustand store bridged with Supabase session
- [ ] Rewrite `auth-store.ts`:
  - State: `{ session, user, isInitialized }`
  - `init()` action: calls `supabase.auth.getSession()`, sets isInitialized
  - Keep `logout()` action but route through `supabase.auth.signOut()`
- [ ] Create `src/lib/auth-init.ts`:
  - `supabase.auth.onAuthStateChange` listener → updates authStore
  - Token refresh handled by Supabase (no custom code)
- **Validate**: Login, refresh page, verify `isInitialized=true` and session restored

### Step 4: HTTP Client Migration
**Deliverable**: All API calls use Supabase JWT
- [ ] Rewrite Axios request interceptor:
  - Remove: `useAuthStore.getState().token`, custom header injection
  - Add: `supabase.auth.getSession()` → `Authorization: Bearer <access_token>`
- [ ] Simplify response interceptor:
  - Keep: biz error code mapping (10001, 10002, etc.)
  - Remove: custom token refresh queue (lines 103-139)
  - Simplify: 401 handling → `supabase.auth.signOut()` + redirect to login
- [ ] Remove `buildLegacyHeaders()` call
- [ ] Update `TOKEN_HEADER` constant to `'Authorization'`
- **Validate**: API request in browser shows Bearer token in Authorization header

### Step 5: Route Guard Update
**Deliverable**: No flash on page refresh, proper loading state
- [ ] Add `isInitialized` check to RouteGuard:
  - If `!isInitialized`: show loading spinner (not redirect)
  - If `isInitialized && !session`: redirect to login
  - If `isInitialized && session && !hasPermission`: show 403
- [ ] Add `init()` call in `App.tsx` before rendering routes
- **Validate**: Hard refresh on authenticated page → no login redirect flash

### Step 6: Login Page Migration
**Deliverable**: Login uses Supabase Auth
- [ ] Create/replace login form handler: `supabase.auth.signInWithPassword()`
- [ ] Handle errors: invalid credentials, email not confirmed, rate limited
- [ ] Remove SM4 encryption from login flow
- [ ] Remove `sm-crypto` dependency from portal-web (if no other uses)
- **Validate**: Login with test email/password → session created → redirected to dashboard

### Step 7: Cleanup Legacy Auth Code
**Deliverable**: No dead code from old auth system
- [ ] Delete `src/utils/crypto.ts` (SM4 encryption)
- [ ] Simplify `src/utils/auth.ts`: remove `clearStoredTokens`, `TOKEN_KEY`, etc.
- [ ] Remove `LEGACY_TOKEN_KEY` and related cache operations in `register.ts`
- [ ] Remove `appConfig.auth.tokenKey` / `appConfig.auth.refreshTokenKey` references
- [ ] Simplify `src/api/auth.ts`: remove custom login/logout API calls (use Supabase SDK)
- [ ] Cleanup `src/utils/http.ts`: remove refresh queue, legacy headers, SM4 references
- **Validate**: `grep -r "ailab-token\|SM4\|sm-crypto\|LEGACY_TOKEN\|refreshToken\|buildLegacyHeaders" apps/portal-web/src/` returns nothing

### Step 8: Sub-app Registration Standardization
**Deliverable**: Documented 3-step process, iam-web verified
- [ ] Standardize `microApps` config structure — document the `MicroAppConfig` interface
- [ ] Create sub-app template directory with:
  - `main.tsx` (lifecycle exports)
  - `vite.config.ts` (qiankun plugin + UMD format)
  - `package.json` with required dependencies
- [ ] Update `setupMicroApps()`:
  - Rename props: `token` → `accessToken`
  - Add `user` prop from authStore
- [ ] Verify iam-web works with updated props:
  - Read `accessToken` instead of `token`
  - `BrowserRouter basename={props.basename}` (already correct)
- **Validate**: iam-web loads inside portal-web, API calls work with JWT

### Step 9: Quality Check
- [ ] Run TypeScript: `pnpm --filter @zanelab/portal-web typecheck`
- [ ] Run linter: `pnpm --filter @zanelab/portal-web lint`
- [ ] Run tests: `pnpm --filter @zanelab/portal-web test`
- [ ] Manual smoke test:
  - Login → dashboard renders
  - Navigate to /iam → iam-web loads
  - Browser refresh → session persists
  - 401 API response → redirect to login
  - Logout → session cleared → login page

## Rollback Points

- **After Step 1**: Supabase project is standalone, no rollback needed
- **After Step 2-3**: Feature flag `auth.provider` in config; revert to `'legacy'` to use old auth
- **After Step 4+**: Old auth code removed, rollback requires git revert

## Risky Files

| File | Risk | Mitigation |
|------|------|------------|
| `http.ts` | Central to all API calls, breakage = all features broken | Test each interceptor change independently |
| `auth-store.ts` | Controls auth state, breakage = login broken | Keep `initialAuthState` export, test in isolation |
| `register.ts` | Micro-app registration, breakage = sub-apps don't load | Verify iam-web after each change |
| `config/` | App-wide configuration, breakage = app doesn't start | Zod schema validates at startup |

## Dependencies Between Steps

```
Step 1 (Supabase) ──┬── Step 2 (Client) ── Step 3 (Auth Store) ── Step 4 (HTTP) ── Step 5 (RouteGuard) ── Step 6 (Login) ── Step 7 (Cleanup) ── Step 8 (Sub-apps) ── Step 9 (QC)
                    │
                    └── (gating prerequisite — Supabase project must be live before anything)
```
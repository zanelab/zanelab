# Supabase Kong Gateway Architecture — Research Findings

> Date: 2026-10-22
> Source: Supabase GitHub repository (kong.yml from master), web research, Kong documentation, community discussions

---

## 1. Supabase Kong Gateway Architecture

### 1.1 Role of Kong in Supabase

Kong serves as the **central API gateway** for all Supabase traffic. Every client request passes through Kong before reaching any backend service. The architecture is polyglot — each backend service is written in the language that suits its purpose — and Kong unifies them behind a single API surface.

```
External Traffic (port 8000 / 8443 TLS)
        │
        ▼
┌─────────────────────────────────────────────────┐
│          Kong API Gateway (kong:2.8.1)           │
│  DB-less declarative mode (KONG_DATABASE: "off") │
│  Config loaded from /etc/kong/kong.yml           │
│                                                  │
│  Plugins: cors, key-auth, basic-auth, acl,       │
│           request-transformer, request-termination│
│           ip-restriction, post-function          │
└───────┬─────┬──────────┬────────┬───────────────┘
        │     │          │        │
        ▼     ▼          ▼        ▼
   ┌────────┐ ┌───────┐ ┌──────┐ ┌──────────┐
   │ GoTrue │ │Postg- │ │Real-  │ │ Storage  │
   │ (Auth) │ │ REST  │ │ time  │ │(Node.js) │
   │  Go    │ │Haskell│ │Elixir │ │          │
   └────────┘ └───────┘ └──────┘ └──────────┘
```

### 1.2 Docker Compose Configuration

Kong is defined in `docker/docker-compose.yml` with these key environment variables:

```yaml
# From Supabase docker-compose.yml
kong:
  image: kong:2.8.1
  environment:
    KONG_DATABASE: "off"                          # DB-less declarative mode
    KONG_DECLARATIVE_CONFIG: /etc/kong/kong.yml   # All config lives here
    KONG_DNS_ORDER: LAST,A,CNAME
    KONG_PLUGINS: bundled                         # Use bundled plugins
    KONG_PROXY_ACCESS_LOG: /dev/stdout
    KONG_ADMIN_ACCESS_LOG: /dev/stdout
    KONG_PROXY_ERROR_LOG: /dev/stderr
    KONG_ADMIN_ERROR_LOG: /dev/stderr
    KONG_ADMIN_LISTEN: 0.0.0.0:8001               # Admin API (internal only)
  ports:
    - "${KONG_HTTP_PORT}:8000/tcp"                # Proxy (public-facing)
    - "${KONG_HTTPS_PORT}:8443/tcp"               # TLS proxy
```

### 1.3 Declarative Configuration (kong.yml)

The full Kong configuration lives at `docker/volumes/api/kong.yml`. It uses Kong's **format version 2.1** with transforms enabled. Supabase chose DB-less mode, which means:
- No Admin API database required at runtime
- All configuration loaded into memory at startup
- Changes to `kong.yml` require a Kong restart (`docker compose restart kong`)
- No Konga UI possible (Konga requires database-backed Admin API)

### 1.4 Services and Routes (17 Total)

The actual `kong.yml` from the Supabase repository defines these services:

#### Open Auth Routes (8 services, CORS only, no auth required)

| Service | Path | Upstream |
|---------|------|----------|
| auth-v1-open | `/auth/v1/verify` | `http://auth:9999/verify` |
| auth-v1-open-callback | `/auth/v1/callback` | `http://auth:9999/callback` |
| auth-v1-open-authorize | `/auth/v1/authorize` | `http://auth:9999/authorize` |
| auth-v1-open-jwks | `/auth/v1/.well-known/jwks.json` | `http://auth:9999/.well-known/jwks.json` |
| auth-v1-open-well-known-oauth | `/auth/v1/.well-known/oauth-authorization-server` | same path |
| auth-v1-open-well-known-openid | `/auth/v1/.well-known/openid-configuration` | same path |
| auth-v1-open-sso-acs | `/auth/v1/sso/saml/acs` | `http://auth:9999/sso/saml/acs` |
| auth-v1-open-sso-metadata | `/auth/v1/sso/saml/metadata` | `http://auth:9999/sso/saml/metadata` |

#### Secure Routes (9 services, key-auth + acl)

| Service | Path | Upstream | ACL Groups |
|---------|------|----------|------------|
| auth-v1 | `/auth/v1/` | `http://auth:9999/` | admin, anon |
| rest-v1 | `/rest/v1/` | `http://rest:3000/` | admin, anon |
| rest-v1-openapi | `/rest/v1/` | `http://rest:3000/` | admin only |
| graphql-v1 | `/graphql/v1` | `http://rest:3000/rpc/graphql` | admin, anon |
| realtime-v1-ws | `/realtime/v1/` (WebSocket) | `realtime-dev.supabase-realtime:4000/socket` | admin, anon |
| realtime-v1-rest | `/realtime/v1/api` | `realtime-dev.supabase-realtime:4000/api` | admin, anon |
| storage-v1 | `/storage/v1/` | `http://storage:5000/` | No key-auth (S3 protocol) |
| functions-v1 | `/functions/v1/` | `http://functions:9000/` | No key-auth (Deno handles JWT) |
| meta | `/pg/` | `http://meta:8080/` | admin only |
| dashboard | `/` | `http://studio:3000/` | basic-auth |
| well-known-oauth | `/.well-known/...` | auth:9999 | CORS only |

#### Blocked Routes (2 services)

| Service | Path | Method |
|---------|------|--------|
| realtime-v1-rest-openapi | `/realtime/v1/` | 403 via request-termination |
| realtime-v1-rest-tenants | `/realtime/v1/` | 403 via request-termination |
| mcp-blocker | `/api/mcp` | 403 via request-termination |
| mcp | `/mcp` | Commented-out ip-restriction config (localhost only) |

---

## 2. Supabase Auth + Kong JWT Integration

### 2.1 JWT Validation Flow

Kong does **not directly validate JWT signatures** in Supabase's architecture. Instead, it uses a clever **key-auth + request-transformation** pattern:

```
1. Client sends request with:
   - apikey: <ANON_KEY or SERVICE_ROLE_KEY>
   - Authorization: Bearer <JWT_TOKEN>

2. Kong validates the apikey against configured consumers (key-auth plugin)

3. Kong's ACL plugin checks the consumer's group membership (admin, anon)

4. Request-transformer plugin injects/transforms the Authorization header
   using Lua expressions:
   - $LUA_AUTH_EXPR: Translates opaque API keys into asymmetric JWTs
     for the Authorization header (used by auth, REST, GraphQL, Realtime REST, storage)

5. The backend service (e.g., PostgREST) receives the JWT and passes claims
   to PostgreSQL for Row Level Security (RLS)
```

### 2.2 Consumers and Credentials

Three consumers are defined in `kong.yml`:

```yaml
consumers:
  - username: DASHBOARD
    basicauth_credentials:
      - username: ${DASHBOARD_USERNAME}
        password: ${DASHBOARD_PASSWORD}
  - username: anon
    keyauth_credentials:
      - key: ${ANON_KEY}
      - key: ${SUPABASE_ANON_KEY}
  - username: service_role
    keyauth_credentials:
      - key: ${SERVICE_ROLE_KEY}
      - key: ${SUPABASE_SERVICE_KEY}
```

### 2.3 ACL Group Mappings

```yaml
acls:
  - consumer: anon
    group: anon
  - consumer: service_role
    group: admin
```

### 2.4 Supabase JWT Claims

A typical Supabase JWT issued by GoTrue contains:

```json
{
  "sub": "user-uuid-123",
  "email": "user@example.com",
  "phone": "",
  "role": "authenticated",
  "aud": "authenticated",
  "exp": 1680314385,
  "iat": 1680310785,
  "iss": "supabase",
  "app_metadata": {
    "provider": "email",
    "providers": ["email"]
  },
  "user_metadata": {
    "full_name": "Jane Doe",
    "avatar_url": "https://..."
  }
}
```

Key claims used by Kong/PostgREST:
- **`sub`** — User UUID, used by PostgreSQL RLS (`auth.uid()`)
- **`role`** — Set to `"authenticated"` for logged-in users
- **`aud`** — Set to `"authenticated"` for logged-in users
- **`app_metadata`** — Application-level metadata (provider info, custom claims)
- **`user_metadata`** — User-editable metadata

### 2.5 Key Lua Expressions (Environment Variables)

The `kong.yml` references three Lua environment variables used by the `request-transformer` plugin:

| Variable | Purpose | Used By |
|----------|---------|---------|
| `$LUA_AUTH_EXPR` | Translates opaque API keys into asymmetric JWTs for the `Authorization` header | auth, REST, GraphQL, Realtime REST, storage |
| `$LUA_RT_WS_EXPR` | Generates WebSocket-compatible `x-api-key` header and `apikey` query param values | Realtime WebSocket |
| `$LUA_FUNCTIONS_EXPR` | Produces the raw API key value for the `sb-api-key` header (no Bearer prefix) | Edge Functions |

### 2.6 How RLS Connects (End-to-End)

The complete flow for an authenticated database request:

```
Client
  │  Authorization: Bearer <user_JWT>
  │  apikey: <anon_key>
  ▼
Kong → key-auth validates apikey → ACL checks group
  → request-transformer adds JWT to downstream Authorization header
  ▼
PostgREST → reads JWT claims → sets PostgreSQL session variables:
  - current_setting('request.jwt.claim.sub') → auth.uid()
  - current_setting('request.jwt.claim.role') → auth.role()
  ▼
PostgreSQL RLS policies use auth.uid() and auth.role()
  to enforce row-level security
```

### 2.7 Known Limitations and Gotchas

1. **Kong does not validate JWT signatures directly** — It relies on the `key-auth` plugin to validate the API key, then injects the JWT downstream. Backend services (PostgREST, GoTrue) are responsible for JWT signature validation.

2. **Two-key system complexity** — Users must send both `apikey` AND `Authorization` headers. Forgetting the `apikey` results in 401 even with a valid JWT.

3. **DB-less mode = no dynamic changes** — Adding new routes or consumers requires modifying `kong.yml` and restarting Kong. No Admin API hot-reload in Supabase's default config.

4. **Kong hostname leakage** — When using email verification, Kong's internal hostname can leak into redirect URLs (GitHub issue #27820). Fix by setting `SITE_URL` and `SUPABASE_PUBLIC_URL` correctly.

5. **Basic-auth on catch-all blocks GraphiQL** — The `basic-auth` plugin on the dashboard catch-all route can block GraphiQL. Workaround: disable basic-auth for local dev or add route exclusions.

6. **Storage service has no key-auth** — To support S3 presigned URLs (where no auth header exists), the storage route uses a `post-function` plugin to clear empty authorization headers instead of the key-auth plugin.

7. **Edge Functions handle their own JWT** — The functions route also has no key-auth; Deno runtime handles `verify_jwt` itself. The request-transformer strips any client-supplied `sb-api-key` and adds the correct one.

---

## 3. API Routing Patterns

### 3.1 Path-Based Routing (Supabase's Default)

Supabase uses **path-based routing** exclusively. Different logical services are differentiated by URL path prefix:

```
/api/v1/     → (blocked, 403)
/auth/v1/    → GoTrue (authentication)
/rest/v1/    → PostgREST (REST API)
/realtime/v1/→ Realtime (WebSocket + REST)
/storage/v1/ → Storage (file management)
/functions/v1/→ Edge Functions (Deno)
/pg/         → Meta (database management)
/            → Studio (dashboard, catch-all)
```

Example Kong configuration for a custom service using path-based routing:

```yaml
services:
  - name: my-api-v1
    url: http://my-api:8080/
    routes:
      - name: my-api-v1-all
        strip_path: true
        paths:
          - /api/v1/
      plugins:
        - name: cors
        - name: key-auth
          config:
            hide_credentials: false
        - name: acl
          config:
            hide_groups_header: true
            allow:
              - admin
              - anon
```

### 3.2 Subdomain-Based Routing

While Supabase does not use subdomain routing natively, Kong supports it via the `hosts` field:

```yaml
services:
  - name: iam-service
    url: http://iam-service:3000/
    routes:
      - name: iam-v1
        hosts:
          - iam.example.com
        paths:
          - /
      plugins:
        - name: cors
        - name: key-auth

  - name: skills-service
    url: http://skills-service:4000/
    routes:
      - name: skills-v1
        hosts:
          - skills.example.com
        paths:
          - /
```

### 3.3 Header-Based Routing

Kong also supports routing by request headers:

```yaml
routes:
  - name: api-v2-header
    headers:
      X-API-Version:
        - "2"
    paths:
      - /api/
```

### 3.4 CORS Configuration

In Supabase's default `kong.yml`, CORS is handled at the **Kong level** via the built-in `cors` plugin applied to all routes:

```yaml
plugins:
  - name: cors
# (The default bundled CORS plugin is applied; in production
#  you would configure specific origins, methods, and headers)
```

To customize CORS per service:

```yaml
plugins:
  - name: cors
    config:
      origins:
        - "https://app.example.com"
        - "https://admin.example.com"
      methods:
        - GET
        - POST
        - PUT
        - DELETE
        - PATCH
        - OPTIONS
      headers:
        - Accept
        - Accept-Version
        - Content-Length
        - Content-MD5
        - Content-Type
        - Date
        - Authorization
        - apikey
      exposed_headers:
        - X-Auth-Token
      credentials: true
      max_age: 3600
```

### 3.5 Recommended Multi-Service Pattern

For adding custom backend services alongside Supabase behind the same Kong:

```yaml
# In docker/volumes/api/kong.yml (extend Supabase's default config)

# Your custom IAM service
services:
  - name: iam-v1
    url: http://iam-service:3000/
    routes:
      - name: iam-v1-all
        strip_path: true
        paths:
          - /iam/v1/
      plugins:
        - name: cors
        - name: rate-limiting
          config:
            minute: 100
            policy: local
        - name: key-auth
          config:
            hide_credentials: false
        - name: acl
          config:
            hide_groups_header: true
            allow:
              - admin
              - anon

  # Your custom Skills service
  - name: skills-v1
    url: http://skills-service:4000/
    routes:
      - name: skills-v1-all
        strip_path: true
        paths:
          - /skills/v1/
      plugins:
        - name: cors
        - name: rate-limiting
          config:
            minute: 200
            policy: redis
            redis_host: redis
            redis_port: 6379
        - name: key-auth
          config:
            hide_credentials: false
        - name: acl
          config:
            hide_groups_header: true
            allow:
              - admin
              - anon
```

---

## 4. Configuration as Code

### 4.1 Version Control for Kong Configuration

Supabase's `kong.yml` is **already version-controlled** in the Supabase GitHub repository. For self-hosted deployments, the workflow is:

1. The `kong.yml` file lives at `docker/volumes/api/kong.yml`
2. Commit it to your own Git repository alongside `docker-compose.yml`
3. Kong runs in DB-less mode, loading the config at startup
4. No dynamic changes via Admin API — everything is declarative

### 4.2 decK — Kong's Declarative Configuration Tool

**decK** (`brew install kong/deck/deck`) is Kong's official CLI for managing configuration as code. Key commands:

```bash
# Export current Kong config (from Admin API)
deck gateway dump --kong-addr http://kong:8001

# Diff local config against running Kong
deck gateway diff kong.yml --kong-addr http://kong:8001

# Sync local config to Kong
deck gateway sync kong.yml --kong-addr http://kong:8001

# Validate config file
deck gateway validate kong.yml
```

### 4.3 CI/CD Pipeline for decK

A typical decK + CI/CD workflow for team environments:

```yaml
# GitHub Actions example
name: Sync Kong Gateway Config

on:
  push:
    branches: [main]
    paths:
      - 'kong/kong.yml'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install decK
        run: |
          curl -sL https://github.com/Kong/deck/releases/download/v1.30.0/deck_1.30.0_linux_amd64.tar.gz -o deck.tar.gz
          tar -xf deck.tar.gz -C /usr/local/bin

      - name: Validate config
        run: deck gateway validate kong/kong.yml

      - name: Diff against staging
        run: deck gateway diff kong/kong.yml --kong-addr ${{ secrets.KONG_ADMIN_STAGING }}
        continue-on-error: true

      - name: Sync to staging
        run: deck gateway sync kong/kong.yml --kong-addr ${{ secrets.KONG_ADMIN_STAGING }}

      # Add testing step here

      - name: Sync to production
        if: github.ref == 'refs/heads/main'
        run: deck gateway sync kong/kong.yml --kong-addr ${{ secrets.KONG_ADMIN_PRODUCTION }}
```

### 4.4 Supabase CLI and Kong

The `supabase` CLI tools (`supabase start`, `supabase link`) manage the **entire Supabase stack** including Kong:

- `supabase start` — Starts all Docker containers including Kong with the bundled `kong.yml`
- `supabase link` — Links a local project to a remote Supabase project (does not directly manage Kong)
- `supabase db push` — Pushes migrations (PostgreSQL only, not Kong config)

**Important:** Supabase's CLI does **not** provide direct Kong configuration management. The `kong.yml` is part of the Docker volumes and is managed independently. For custom Kong routes, you edit `kong.yml` directly, then restart the Kong container.

### 4.5 Team Workflow Best Practices

| Practice | Description |
|----------|-------------|
| **Git as single source of truth** | All Kong config (`kong.yml`, environment variables) in Git |
| **PR-based changes** | Kong config changes go through PRs with review |
| **Environment-specific configs** | Use env vars (`${VAR_NAME}`) in kong.yml; `.env` files per environment |
| **CI/CD automation** | Merge → validate → diff → sync to staging → test → sync to prod |
| **Config drift detection** | Run `deck gateway diff` periodically to detect manual Admin API changes |
| **Secrets management** | Keys, passwords via environment variables or secrets manager; never commit to Git |

---

## 5. Rate Limiting and Security

### 5.1 Available Rate Limiting Policies

Kong's built-in `rate-limiting` plugin supports:

| Policy | Description | Best For |
|--------|-------------|----------|
| `local` | In-memory counters per Kong node | Single-node, simple setups |
| `cluster` | Database-backed counters (requires PostgreSQL) | Multi-node DB-backed Kong |
| `redis` | Redis-backed counters | Multi-node, production setups |

Time windows: `second`, `minute`, `hour`, `day`, `month`, `year`

### 5.2 Per-Service Rate Limiting Examples

**Simple local rate limit:**

```yaml
plugins:
  - name: rate-limiting
    config:
      minute: 100
      policy: local
      hide_client_headers: false
      fault_tolerant: true
```

**Redis-backed production rate limit:**

```yaml
plugins:
  - name: rate-limiting
    config:
      second: 10
      minute: 200
      hour: 10000
      policy: redis
      redis_host: redis
      redis_port: 6379
      redis_password: ${REDIS_PASSWORD}
      redis_timeout: 2000
      fault_tolerant: true
      hide_client_headers: false
```

**Per-consumer rate limits (e.g., different limits for anon vs admin):**

```yaml
consumers:
  - username: anon
    keyauth_credentials:
      - key: ${ANON_KEY}

plugins:
  - name: rate-limiting
    consumer: anon
    config:
      minute: 30       # Stricter limit for anonymous users
      policy: local
```

### 5.3 IP Allowlisting / Blocklisting

Kong's built-in `ip-restriction` plugin:

```yaml
# Allowlist mode — only allow specific IPs/ranges
plugins:
  - name: ip-restriction
    config:
      allow:
        - 10.0.0.0/8
        - 172.16.0.0/12
        - 192.168.1.100

# Denylist mode — block specific IPs
plugins:
  - name: ip-restriction
    config:
      deny:
        - 1.2.3.4
        - 5.6.7.0/24
```

**Supabase already uses ip-restriction** for the MCP endpoint (commented out by default), showing how to restrict access to localhost:

```yaml
# From Supabase's kong.yml (commented out)
# - name: ip-restriction
#   config:
#     allow:
#       - 127.0.0.1
#       - ::1
```

### 5.4 Layered Security Strategy

A comprehensive production security setup combines multiple Kong plugins:

```yaml
services:
  - name: my-api-v1
    url: http://my-api:8080/
    routes:
      - name: my-api-v1-all
        strip_path: true
        paths:
          - /api/v1/
    plugins:
      # Layer 1: IP allowlisting — first line of defense
      - name: ip-restriction
        config:
          allow:
            - 10.0.0.0/8           # Internal network
            - your-vpn-ip/32       # VPN exit node

      # Layer 2: Rate limiting — abuse protection
      - name: rate-limiting
        config:
          second: 10
          minute: 200
          policy: redis
          redis_host: redis
          redis_port: 6379

      # Layer 3: API key authentication
      - name: key-auth
        config:
          hide_credentials: false

      # Layer 4: Access control
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
            - anon

      # Layer 5: CORS
      - name: cors
        config:
          origins:
            - "https://app.example.com"
          credentials: true

      # Layer 6: Request size limiting (prevents large payload attacks)
      - name: request-size-limiting
        config:
          allowed_payload_size: 10  # MB

      # Layer 7: Response transformation (remove server headers)
      - name: response-transformer
        config:
          remove:
            headers:
              - Server
              - X-Powered-By
              - X-Kong-Response-Latency
```

### 5.5 Additional Security Plugins Available in Kong

| Plugin | Purpose |
|--------|---------|
| `request-size-limiting` | Block requests exceeding a size limit |
| `response-ratelimiting` | Limit response rate (custom HTTP headers) |
| `bot-detection` | Detect and block bots |
| `proxy-cache` | Cache responses to reduce backend load |
| `request-validator` | Validate request body against a schema |
| `oauth2` | OAuth 2.0 authentication (alternative to JWT) |
| `openid-connect` | OpenID Connect integration |
| `acme` | Automatic Let's Encrypt certificate management |

### 5.6 Practical Considerations for Supabase Self-Hosting

1. **Resource overhead:** Kong alone can consume up to 2.5 GB RAM under load. The full Supabase stack needs 8-16 GB RAM for production.

2. **Config persistence:** In DB-less mode, config changes require a Kong restart. Use `docker compose restart kong` to apply changes.

3. **Redis dependency:** For Redis-backed rate limiting, add a Redis service to `docker-compose.yml`:
   ```yaml
   redis:
     image: redis:7-alpine
     restart: unless-stopped
     volumes:
       - redis_data:/data
   ```

4. **Kong Admin API security:** Do NOT expose port 8001 publicly. It should be internal-only or firewalled.

5. **API key rotation:** Rotating `ANON_KEY` and `SERVICE_ROLE_KEY` requires updating both `.env` and `kong.yml`, then restarting Kong.

6. **Plugin order matters:** Plugins are executed in order of definition. Place security-related plugins (ip-restriction, rate-limiting) before routing plugins.

---

## Appendix: Key Resources

- **Official Supabase Kong config:** `https://github.com/supabase/supabase/blob/master/docker/volumes/api/kong.yml`
- **Supabase Self-Hosting Guide:** `https://supabase.com/docs/guides/self-hosting/docker`
- **Kong Gateway Documentation:** `https://docs.konghq.com/gateway/`
- **decK Documentation:** `https://docs.konghq.com/deck/`
- **Kong Rate Limiting Plugin:** `https://docs.konghq.com/hub/kong-inc/rate-limiting/`
- **Kong IP Restriction Plugin:** `https://docs.konghq.com/hub/kong-inc/ip-restriction/`
- **Supabase JWT Documentation:** `https://supabase.com/docs/guides/auth/jwts`
- **Community Traefik Alternative:** `https://github.com/supabase-community/supabase-traefik`
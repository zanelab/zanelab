# Type Safety

> Type patterns and validation in `apps/portal-web/`.

---

## Overview

The project uses **TypeScript ~6.0** with **Zod v4** for runtime validation. All types originate from the shared `@zanelab/types` package; `apps/portal-web/src/types/index.ts` simply re-exports:

```tsx
// types/index.ts
export * from '@zanelab/types';
```

The tsconfig extends the workspace base:
```json
// package.json
"@zanelab/tsconfig": "workspace:*"
```

Path aliases are configured via Vite/tsconfig to support `@/` imports (e.g., `@/config`, `@/stores/auth-store`).

---

## Type Organization

### Shared Types (`@zanelab/types`)

All domain types are defined in the shared `@zanelab/types` package and consumed via re-export. This includes:

- `AppConfig` and `AppConfigSchema` -- Zod schema for runtime app configuration
- `MenuItem` -- menu tree item type
- `UserInfo` -- authenticated user shape
- `MenuRecordRaw` -- menu shell representation
- `LayoutMode`, `ContentCompact`, `NavigationStyleType`, `BreadcrumbStyleType`, `BuiltinThemeType`, `AccessModeType`, `LoginExpiredModeType`, `AuthPageLayoutType`, `LogoFitType`, `HeaderMode` -- enum-like string union types for layout/theme config
- `IconData` and `IconDataSchema` -- Zod schema for SVG icon data
- `MicroAppConfig` -- qiankun sub-application configuration
- `LoginResult` -- shape returned by auth API

### Local Types

Types defined within the portal-web package itself:

- **Store interfaces** (`AuthState`, `MenuState`, `SessionState`, `LayoutState`, etc.) -- colocated with each store file
- **API types** (`ApiEnvelope`, `BizCodeError` in `utils/http.ts`; `LegacyLoginParams`, `LegacyLoginResponse` in `api/auth.ts`)
- **Component props** (`PermissionProps`, `RouteGuardProps`) -- colocated with components
- **Utility types** (`DropdownMenuEntry` in `utils/menu-views.ts`; `TabDefinition` in `stores/tabbar-store.ts`)

---

## Zod Runtime Validation

### AppConfig Validation

The runtime config is validated against `AppConfigSchema` (defined in `@zanelab/types`) in `config/index.ts`:

```tsx
import { AppConfigSchema, type AppConfig } from '@zanelab/types';

export function loadConfig(): AppConfig {
  const raw = window.__APP_CONFIG__;
  const merged = raw
    ? mergeConfig(structuredClone(DEFAULT_CONFIG), raw)
    : structuredClone(DEFAULT_CONFIG);
  const parsed = AppConfigSchema.safeParse(merged);
  if (!parsed.success) {
    console.error(
      '[config] 运行时配置校验失败，已回退默认配置：',
      parsed.error.flatten(),
    );
    return structuredClone(DEFAULT_CONFIG);
  }
  return parsed.data;
}
```

Key pattern: `safeParse` with graceful fallback to defaults. Never throws on invalid config -- always returns a valid config object. Validation failures are logged to console as warnings.

### Icon Pack Validation

Each icon entry in the icon registry is validated against `IconDataSchema`:

```tsx
import { IconDataSchema } from '@zanelab/types';
import type { IconData } from '@zanelab/types';

function sanitizePack(pack: Record<string, IconData>): Record<string, IconData> {
  const valid: Record<string, IconData> = {};
  for (const [key, value] of Object.entries(pack)) {
    const parsed = IconDataSchema.safeParse(value);
    if (parsed.success) {
      valid[key] = parsed.data;
    } else {
      console.warn(
        `[icon-registry] 图标条目 "${key}" 校验失败已跳过（须为 { viewBox?, paths: string[] }）：`,
        value,
      );
    }
  }
  return valid;
}
```

Invalid entries are skipped individually with warnings; valid entries are preserved.

---

## Deep Merge Pattern

The `mergeConfig` function in `config/index.ts` performs a recursive shallow-merge for nested objects:

```tsx
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function mergeConfig(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(source)) {
    const targetValue = target[key];
    if (isPlainObject(targetValue) && isPlainObject(value)) {
      out[key] = mergeConfig(targetValue, value);
    } else {
      out[key] = value;
    }
  }
  return out;
}
```

This same pattern is reused in `preferences-store.ts` for `updatePreferences` and `applyConfigPreferences`.

---

## Common Type Patterns

### String Unions for Config Values

Layout modes, theme types, and navigation styles use string literal unions from `@zanelab/types`:

```tsx
import type {
  LayoutMode,
  ContentCompact,
  NavigationStyleType,
  BreadcrumbStyleType,
  BuiltinThemeType,
  AccessModeType,
  AuthPageLayoutType,
} from '@zanelab/types';
```

### Discriminated Error Types

```tsx
// utils/http.ts
export interface BizCodeError extends Error {
  bizCode?: string | number;
}
```

### API Envelope

```tsx
export interface ApiEnvelope<T = unknown> {
  code: number | string;
  data: T;
  msg?: string;
  message?: string;
  success?: boolean;
}
```

### User/System Types

```tsx
// constants/auth.ts
export const SystemType = {
  PLATFORM: '-P',  // platform admin level
  TENANT: '-T',    // tenant admin level
  ORG: '-O',       // organization level
} as const;
```

---

## Module Augmentation (window globals)

TypeScript's `declare global` is used to extend `Window`:

```tsx
// config/index.ts
declare global {
  interface Window {
    __APP_CONFIG__?: Record<string, unknown>;
  }
}

// stores/icon-store.ts
declare global {
  interface Window {
    __registerIcons?: (pack: Record<string, IconData>) => void;
  }
}

// utils/http.ts
declare global {
  interface Window {
    __http: typeof httpProxy;
  }
}
```

---

## DeepPartial Utility

A local `DeepPartial<T>` utility is defined in `stores/preferences-store.ts` for the `updatePreferences` method:

```tsx
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

// Usage:
updatePreferences: (partial: DeepPartial<PreferencesState>) => void;
```

---

## Forbidden Patterns

| Pattern | Why |
|---------|-----|
| `as any` | Bypasses type checking; use specific type assertions or `unknown` cast |
| `// @ts-ignore` | Suppresses real errors; fix the type instead |
| `JSON.parse()` without type guards | Unknown input; validate with Zod before trusting |
| `Record<string, any>` in public APIs | Use `Record<string, unknown>` and narrow with type guards |
| `as` casts on config values | Config is Zod-validated; trust the inferred type from `AppConfigSchema.safeParse` |
| Implicit `any` parameters | Use explicit types even in callbacks |
| `!!` double-negation for non-empty string checks | Use explicit `!== undefined && !== ''` checks |

### Acceptable `as` Usage

- `as never` for `cloneElement` when spreading unknown props onto a known component type (see `Permission.tsx`)
- `as unknown as Promise<T>` in HTTP client wrapper functions (see `api/auth.ts`)
# Type Safety

> Type safety patterns in `@zanelab/iam-web`.

---

## Overview

This project uses **TypeScript 6.0** with **strict mode** enabled. All source files are `.tsx` and fully typed. The `tsconfig.json` enforces strict checks and unused variable/parameter detection.

```jsonc
// apps/iam-web/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

Key options:
- **`strict: true`** — enables all strict type-checking flags (strictNullChecks, noImplicitAny, etc.)
- **`noUnusedLocals: true`** — build fails if a local variable is declared but never used
- **`noUnusedParameters: true`** — build fails if a function parameter is declared but never used
- **`moduleResolution: "bundler"`** — Vite-style module resolution
- **`isolatedModules: true`** — each file is treated as an isolated module (required by Vite/esbuild)
- **`@/*` path alias** — maps to `./src/*`, configured as a Vite resolve alias in `vite.config.ts`

---

## Type Organization

Types are defined **inline where they are used**. There are no separate `types/` or `interfaces/` directories:

```tsx
// src/main.tsx — the only exported interface
export interface PltProps {
  container?: HTMLElement;
  setHasRender?: (v: boolean) => void;
  getHostState?: () => Record<string, unknown>;
  onHostStateChange?: (
    cb: (state: Record<string, unknown>, prev: Record<string, unknown>) => void,
    fireImmediately?: boolean,
  ) => () => void;
  [key: string]: unknown;
}
```

```tsx
// src/App.tsx — local interface for component-internal data
interface Msg {
  role: 'user' | 'bot';
  text: string;
}
```

```tsx
// src/App.tsx — inline prop type for component parameter
function SystemPage({ title }: { title: string }) { ... }
```

---

## Validation

There is **no runtime validation** in this project. No Zod, Yup, io-ts, or other schema validation library is used. Type safety is enforced at compile time by TypeScript.

For host-injected props accessed via the `[key: string]: unknown` index signature on `PltProps`, defensive runtime guards are used:

```tsx
// src/App.tsx
Array.isArray(props.permissions) ? props.permissions.length : 0

// src/main.tsx
const basename = (props.basename as string | undefined) ?? '/system';
```

When adding real API integration, consider adding Zod schemas for API response validation.

---

## Common Patterns

### Index Signature for Extensible Props

`PltProps` uses `[key: string]: unknown` to allow the Qiangun host to inject arbitrary properties without explicit typing:

```tsx
export interface PltProps {
  container?: HTMLElement;
  // ... known fields ...
  [key: string]: unknown;  // allows basename, token, permissions, etc.
}
```

This is a pragmatic pattern for micro-frontend host-child communication where the exact set of injected props may change.

### Type Assertions with Fallbacks

When reading from the index signature, use type assertions guarded with nullish coalescing:

```tsx
const basename = (props.basename as string | undefined) ?? '/system';
```

### Union Types for Discriminated Data

The `Msg` interface uses a string literal union for role discrimination:

```tsx
interface Msg {
  role: 'user' | 'bot';
  text: string;
}
```

This enables exhaustive checking and clear intent.

### Functional State Updaters

TypeScript infers the correct types for functional `useState` updaters:

```tsx
setMessages((m) => [...m, { role: 'user', text }]);
// m is inferred as Msg[]
```

---

## Forbidden Patterns

1. **`any` type** — never use `any`. Use `unknown` with type guards if needed. The `PltProps` index signature correctly uses `unknown`, not `any`.
2. **`as` assertions without guards** — prefer `typeof` checks or `Array.isArray()` before asserting. The `basename` access with `as string | undefined` is acceptable because it's followed by `?? '/system'`.
3. **`@ts-ignore` or `@ts-expect-error`** — these should never appear. The strict config ensures all code is properly typed.
4. **Default exports** — the project uses named exports exclusively. Default exports make refactoring harder and lose type information in IDE autocompletion.
5. **Separate type files for single-use types** — `Msg` is defined in the same file where it's used. Only extract types to shared files when they're used across multiple modules.
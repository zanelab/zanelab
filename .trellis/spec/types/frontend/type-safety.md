# Type Safety

> Type safety patterns for `@zanelab/types` consumers.

---

## Overview

This package uses **Zod** (v4.x) for runtime validation and TypeScript's type system for compile-time guarantees. The two are linked through `z.infer`.

---

## Type Organization

Types are organized by domain, each in its own file:

| File | Domain | Pattern |
|------|--------|---------|
| `config.ts` | Application configuration | Zod schemas + `z.infer` |
| `layout.ts` | Layout engine properties | Union types + interface |
| `menu.ts` | Menu/navigation trees | Recursive interfaces |
| `index.ts` | Core app entities | Interfaces (`MenuItem`, `UserInfo`) |

Shared types used across packages are defined here. Local component-specific types belong in their component files.

---

## Validation

### Zod Schema First

Runtime validation uses schemas defined in `packages/types/src/config.ts`. The pattern:

```ts
// 1. Define the schema
export const AppConfigSchema = z.object({
  version: z.string(),
  system: SystemConfigSchema,
  // ...
});

// 2. Infer the type
export type AppConfig = z.infer<typeof AppConfigSchema>;
```

Consumers validate at the boundary:

```ts
import { AppConfigSchema } from '@zanelab/types';

const raw = await fetch('/config.json').then(r => r.json());
const config: AppConfig = AppConfigSchema.parse(raw);
```

### Zod Features Used

- **`z.object()`** — structured object validation
- **`z.string()`**, **`z.boolean()`**, **`z.number()`** — primitives
- **`z.enum([...])`** — constrained string values
- **`z.record(z.string(), z.unknown()).default({})`** — string-keyed dictionaries
- **`.optional()`** — nullable fields that may be absent
- **`.default(value)`** — fields with fallback values
- **`z.array(z.string()).min(1)`** — non-empty arrays

---

## Common Patterns

### Union Types as Enums

```ts
export type LayoutMode =
  | 'sidebar-nav'
  | 'mixed-nav'
  | 'sidebar-mixed-nav'
  | 'header-nav'
  | 'full-content'
  | 'header-mixed-nav'
  | 'header-sidebar-nav';
```

Use `type` with string literals, never TypeScript `enum`. This avoids runtime overhead and tree-shaking issues.

### Recursive Menu Types

```ts
export interface MenuRecordRaw {
  path: string;
  name: string;
  icon?: string | ReactNode;
  children?: MenuRecordRaw[];  // self-referencing
  meta?: {
    title: string;
    hideInMenu?: boolean;
    order?: number;
  };
}
```

### `import type` for Zero Runtime Cost

Always use `import type` when only the type is needed:

```ts
import type { MenuRecordRaw } from '@zanelab/types';
```

This is erased at compile time and adds zero bytes to the bundle.

---

## Forbidden Patterns

- **`as` type assertions** — type is inferred from schema, trust it
- **`any`** — never use; `unknown` is acceptable in config bags (`Record<string, unknown>`)
- **`enum` keyword** — use `type X = 'a' | 'b'` union types
- **Non-exported types** — all types should be exported for consumers
- **Inline complex types in component props** — extract to `@zanelab/types` if shared

---

**Language:** All documentation should be written in **English**.
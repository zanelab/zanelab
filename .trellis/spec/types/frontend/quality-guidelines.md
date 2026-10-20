# Quality Guidelines

> Code quality standards for `@zanelab/types` frontend consumption.

---

## Overview

When using `@zanelab/types` in React applications, follow these quality rules to ensure type safety and zero runtime overhead.

---

## Forbidden Patterns

- **`import` without `type`** — always use `import type` for type-only imports
  ```ts
  // WRONG: adds no runtime value but is misleading
  import { MenuRecordRaw } from '@zanelab/types';

  // RIGHT:
  import type { MenuRecordRaw } from '@zanelab/types';
  ```
- **Re-defining types that already exist** — check `@zanelab/types` before creating local duplicates
- **`any` type guards** — narrow properly with type predicates or Zod `.parse()`
- **Modifying schema exports** — schemas like `AppConfigSchema` should be consumed as-is, not extended locally

---

## Required Patterns

- Schema validation at the boundary: validate raw data (API response, config file, localStorage) with `.parse()` before using as typed
- `import type` for all type-only imports
- Use Zod `.parse()` for runtime validation (throws on failure) or `.safeParse()` for error handling
- Prefer `z.infer<typeof Schema>` over manually re-typing schema-shaped objects

---

## Testing Requirements

- Type correctness is verified by `pnpm typecheck` at the consuming package level
- Schema validation logic should be tested where the schema is consumed, not in `@zanelab/types`

---

## Code Review Checklist

- [ ] All type imports use `import type`
- [ ] No local type definitions that duplicate types from `@zanelab/types`
- [ ] Runtime validation uses Zod schemas from this package
- [ ] No schema modifications outside this package

---

**Language:** All documentation should be written in **English**.
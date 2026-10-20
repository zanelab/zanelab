# Quality Guidelines

> Code quality standards for `@zanelab/types`.

---

## Overview

`@zanelab/types` is a pure types package. Quality focuses on type correctness, schema validity, and export hygiene.

---

## Forbidden Patterns

- **`any`** — never use; prefer `unknown` and narrow with type guards
- **`enum` keyword** — use string literal union types (`type X = 'a' | 'b'`) instead
- **Default exports** — always use named exports (`export type`, `export const`)
- **Type assertions (`as`)** — define proper types instead of casting
- **Circular imports** — types should never import from each other cyclically
- **Runtime code** — this package exports only types and schemas; no functions with side effects

---

## Required Patterns

- Every new type module must be re-exported from `src/index.ts`
- Schema names: `PascalCaseSchema` (e.g., `AppConfigSchema`)
- Inferred type names: match schema name without suffix (e.g., `AppConfig`)
- Interfaces: `export interface` with PascalCase
- Union types: `export type` with PascalCase
- All exports: `export` keyword, never `export default`

---

## Testing Requirements

- Type-level tests: run `pnpm typecheck` (tsc --noEmit)
- Schema tests: if other packages parse config with these schemas, those tests should be in the consuming package
- This package has no test suite of its own — correctness is verified by TypeScript compilation

---

## Code Review Checklist

- [ ] New types are exported from `src/index.ts`
- [ ] No `any` or `enum` usage
- [ ] Zod schemas have corresponding inferred types
- [ ] `.default()` values match the declared type
- [ ] Ambient declarations only cover actually-used API surface
- [ ] No runtime logic or side effects

---

**Language:** All documentation should be written in **English**.
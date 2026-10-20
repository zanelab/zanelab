# Quality Guidelines

> Code quality standards for `@zanelab/utils` backend utilities.

---

## Overview

`@zanelab/utils` quality focuses on module isolation, pure function design, and proper singleton management.

---

## Forbidden Patterns

- **`any`** — use `unknown` for truly dynamic values; narrow before use
- **Default exports** — always use named exports
- **Class-based singletons** — use module-scoped objects with closures
- **Exporting mutable state** — internal state (listeners, sequences, timers) must be private
- **Mixing React and non-React concerns** — React-specific utils (`sync-navigate`, `find-menu-by-path`) are separate files
- **Direct DOM access in non-React utils** — `cache.ts` uses `localStorage` which is acceptable; avoid `document` or `window` in non-React modules
- **Throwing in pure functions** — return `null`/`undefined` for invalid input

---

## Required Patterns

- Single responsibility per module file
- `as const` on all configuration objects
- Derived types from configs (`type X = keyof typeof CONFIG.x`)
- Public API only — internal helpers are not exported
- `export * from './module'` in `index.ts`

---

## Testing Requirements

- Unit tests via Vitest: `pnpm test`
- Test pure functions with input/output assertions
- Test singleton state isolation (reset between tests)
- Test edge cases: empty input, invalid JSON, missing keys

---

## Code Review Checklist

- [ ] Single concern per file
- [ ] No `any` types
- [ ] Internal state is private
- [ ] `as const` on config objects
- [ ] Barrel export added to `src/index.ts`
- [ ] New module has tests (where applicable)
- [ ] Error paths call `notify.error()` or return `null`/`undefined`

---

**Language:** All documentation should be written in **English**.
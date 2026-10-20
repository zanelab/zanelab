# Quality Guidelines

> Code quality standards for `@zanelab/utils` frontend utilities.

---

## Overview

Frontend utility quality focuses on tree-shakability, proper React 19 patterns, and avoiding unnecessary React imports.

---

## Forbidden Patterns

- **Hooks in utility files** — utilities should be plain functions; hooks belong in `apps/`
- **JSX in utility files** — no rendering in utils
- **Importing React namespace** — import only specific APIs: `import { flushSync } from 'react-dom'`
- **Default exports** — always named exports
- **`any`** — use `unknown` or generics
- **Mutating input objects** — always return new objects via spread

---

## Required Patterns

- `import type` for type-only imports from `@zanelab/types`
- Explicit return types on exported functions
- Spread operator for immutability
- Recursive functions guard children before recursing
- `export * from './module'` in barrel

---

## Testing Requirements

- Unit tests for menu search functions with various tree shapes
- Type checks: `pnpm typecheck`
- Lint: `pnpm lint`

---

## Code Review Checklist

- [ ] No JSX or hooks in utility files
- [ ] All type imports use `import type`
- [ ] Spread operator used for new objects (no mutation)
- [ ] Return types are explicit
- [ ] Barrel export added

---

**Language:** All documentation should be written in **English**.
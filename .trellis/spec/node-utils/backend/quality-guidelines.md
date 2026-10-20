# Quality Guidelines

> Code quality standards for `@zanelab/node-utils`.

---

## Overview

Quality enforcement is split across three tools:
- **oxlint** (`pnpm lint`) — fast JavaScript/TypeScript linter
- **TypeScript** (`pnpm typecheck`) — `tsc --noEmit` with strict config from `@zanelab/tsconfig/node.json`
- **Vitest** (`pnpm test`) — unit and integration tests

---

## Forbidden Patterns

### No default exports from utility modules

All source modules use named exports only. The barrel `index.ts` may use `export { default as X }` for CJS interop with third-party libraries.

```typescript
// CORRECT
export { generatorContentHash } from './hash';

// WRONG in src/hash.ts
export default generatorContentHash;
```

### No browser APIs

This is a Node.js-only package. Do not use `window`, `document`, `localStorage`, `fetch` (use `node:fs`, `execa`, etc. instead).

### No `any` without explicit `eslint-disable`

TypeScript strict mode is enabled via `@zanelab/tsconfig/node.json`. Avoid `any`; prefer `unknown` or proper generics.

### No direct `console.log` for user-facing output

Use `consola` for structured logging. Chalk/colors are available through the barrel re-export for terminal styling only.

---

## Required Patterns

### All utility functions must be exported through `index.ts`

Consumers import from `@zanelab/node-utils`, not from individual source files:

```typescript
// CORRECT
import { generatorContentHash, findMonorepoRoot } from '@zanelab/node-utils';

// WRONG — bypasses the barrel
import { generatorContentHash } from '@zanelab/node-utils/hash';
```

### Tests co-located with source

Tests live in `src/__tests__/` with `*.test.ts` naming:

```
src/
├── hash.ts
└── __tests__/
    └── hash.test.ts
```

### Third-party re-exports through the barrel

Common Node.js tooling libraries are re-exported from `index.ts` so consumers have a single import surface:

- `execa` — process execution
- `chalk` (as `colors`) — terminal styling
- `consola` — structured logging
- `node:fs/promises` (as `fs`) — file system
- `pkg-types` (`readPackageJSON`, `PackageJson`) — package.json parsing
- `rimraf` — file/directory removal

---

## Testing Requirements

Tests use **Vitest 5** with its standard `describe`/`it`/`expect` API. All test files import from `vitest` directly:

```typescript
import { describe, expect, it } from 'vitest';
```

Requirements:
1. **Unit tests** for pure functions (`hash.ts`, `path.ts`) — test edge cases and determinism
2. **Integration smoke test** (`consume.test.ts`) — verifies the barrel `index.ts` exports work end-to-end
3. No snapshot tests needed for this utility layer
4. File-system or git-dependent tests (if added) should use `fs` fixtures or mock `execa`

---

## Logging Conventions

This package provides `consola` (re-exported through the barrel) and expects consumers to use it for structured logging. Within utility functions, prefer:

- `console.error` only for unrecoverable errors in catch blocks (see `fs.ts` examples)
- Return values or thrown errors for caller to handle — don't log inside pure library functions
- Callers of CLI scripts use `consola` for user-facing messages
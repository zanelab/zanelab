# Directory Structure

> How `tooling/node-utils/src/` is organized.

---

## Overview

The package follows a **flat module layout**: each utility domain gets its own file, and `index.ts` serves as the barrel re-export for consumers.

---

## Directory Layout

```
tooling/node-utils/
├── package.json              # Package metadata, scripts, dependencies
├── tsconfig.json             # Extends @zanelab/tsconfig/node.json
├── src/
│   ├── index.ts              # Barrel: re-exports all utils + third-party libs
│   ├── constants.ts          # Unicode glyph constants
│   ├── date.ts               # dayjs pre-configured with UTC+timezone
│   ├── fs.ts                 # JSON file I/O and file-ensure helpers
│   ├── git.ts                # Git utilities (staged files, re-export @changesets/git)
│   ├── hash.ts               # Content-based MD5 hashing
│   ├── monorepo.ts           # Monorepo root detection and package listing
│   ├── path.ts               # Cross-platform path normalization
│   ├── prettier.ts           # Run prettier on a file
│   ├── spinner.ts            # ora-based async spinner wrapper
│   └── __tests__/            # Vitest test files (co-located)
│       ├── hash.test.ts
│       ├── path.test.ts
│       └── consume.test.ts   # Integration-style test via barrel import
```

---

## Module Organization

Each file exports a small set of named functions. There are no subdirectories or nested modules — everything is flat at `src/`.

When adding a new utility:
1. Create `src/<domain>.ts` with named exports only (no default exports)
2. Add `export * from './<domain>'` to `src/index.ts`
3. Add a corresponding `src/__tests__/<domain>.test.ts`

---

## Naming Conventions

- **Files**: lowercase, kebab-case domain name (`git.ts`, `hash.ts`, `monorepo.ts`)
- **Functions**: camelCase (`findMonorepoRoot`, `generatorContentHash`, `toPosixPath`)
- **Exports**: all named exports; no default exports from utility modules
- **Re-exports**: `index.ts` may use `export { default as colors } from 'chalk'` for CJS default interop

---

## Examples

- **`monorepo.ts`** — self-contained domain with 4 related exports (`findMonorepoRoot`, `getPackagesSync`, `getPackages`, `getPackage`)
- **`constants.ts`** — tiny module with a single enum export
- **`spinner.ts`** — one generic async function with a typed options interface
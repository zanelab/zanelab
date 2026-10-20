# Directory Structure

> How `@zanelab/utils` source code is organized.

---

## Overview

`@zanelab/utils` uses a **flat `src/` directory** where each module is a single file with a single concern. All modules are re-exported through the barrel `index.ts`.

---

## Directory Layout

```
packages/utils/
├── package.json
└── src/
    ├── index.ts            # barrel: re-exports all modules
    ├── cache.ts            # localStorage cache wrapper with TTL
    ├── color.ts            # Color conversion and CSS variable generation
    ├── diff.ts             # Deep object diff and array equality
    ├── locale.ts           # Locale normalization (zh-CN, en-US)
    ├── notify.ts           # Pub/sub notification singleton
    ├── nprogress.ts        # NProgress wrapper (start/stop)
    ├── password.ts         # Password policy validation
    ├── password-policy.ts  # Password policy constants
    ├── find-menu-by-path.ts # React-specific: recursive menu tree search
    └── sync-navigate.ts    # React-specific: flushSync navigation
```

---

## Module Organization

| Category | Modules | Dependency |
|----------|---------|------------|
| Platform-agnostic | `cache`, `color`, `diff`, `locale`, `notify`, `password`, `password-policy` | None (or `@ctrl/tinycolor`) |
| React-specific | `sync-navigate`, `find-menu-by-path` | `react-dom`, `@zanelab/types` |
| Sidecar wrappers | `nprogress` | `nprogress` |

---

## Barrel Export Pattern

`src/index.ts` uses `export * from './module'` for every module:

```ts
export * from './cache';
export * from './color';
export * from './diff';
export * from './locale';
export * from './notify';
export * from './nprogress';
export * from './password';
export * from './password-policy';
export * from './sync-navigate';
export * from './find-menu-by-path';
```

---

## Adding a New Utility

1. Create `src/new-utility.ts`
2. Export functions, constants, or objects
3. Add `export * from './new-utility'` to `src/index.ts`

---

**Language:** All documentation should be written in **English**.
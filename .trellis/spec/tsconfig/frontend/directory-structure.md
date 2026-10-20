# Directory Structure

> How `@zanelab/tsconfig` is organized.

---

## Package Layout

```
tooling/tsconfig/
├── base.json          # Shared baseline config
├── react-app.json     # React/Vite app config (extends base)
├── node.json          # Node.js config (extends base)
└── package.json       # Package metadata with named exports
```

Each config is a standalone JSON file that can be extended independently. The package exports each config by name:

```json
{
  "exports": {
    "./base.json": "./base.json",
    "./react-app.json": "./react-app.json",
    "./node.json": "./node.json"
  }
}
```

Consumer packages extend in their `tsconfig.json`:

```json
{
  "extends": "@zanelab/tsconfig/react-app.json"
}
```

---

## `base.json` — Shared Baseline

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "@zanelab base",
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "moduleDetection": "force",
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "noEmit": true,
    "skipLibCheck": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

Key design decisions:

- **`noEmit: true`** — the project uses Vite/esbuild for transformation, not `tsc`
- **`moduleResolution: "bundler"`** — matches the project's use of Vite and esbuild
- **`isolatedModules: true`** — required for `allowImportingTsExtensions` and ensures each file can be transpiled independently
- **`skipLibCheck: true`** — skips type-checking of `.d.ts` files for faster builds

---

## `react-app.json` — React/Vite Frontend

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "@zanelab react-app",
  "extends": "./base.json",
  "compilerOptions": {
    "useDefineForClassFields": true,
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "jsx": "react-jsx"
  }
}
```

Added beyond base:

| Option | Purpose |
|--------|---------|
| `lib: ["ES2023", "DOM", "DOM.Iterable"]` | Includes browser DOM type definitions |
| `types: ["vite/client"]` | Vite-specific types (`import.meta.env`, asset imports) |
| `jsx: "react-jsx"` | New JSX transform (no `import React` needed) |
| `useDefineForClassFields` | Standard ES class field semantics |

---

## `node.json` — Node.js Backend

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "@zanelab node",
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["ES2023"],
    "types": ["node"]
  }
}
```

Added beyond base:

| Option | Purpose |
|--------|---------|
| `lib: ["ES2023"]` | ES standard library only, no DOM |
| `types: ["node"]` | Node.js specific types (`process`, `Buffer`, `fs`, etc.) |

---

## Inheritance Chain

```
base.json
  ├── react-app.json   (adds DOM lib, jsx, vite types)
  └── node.json        (adds node types, ES-only lib)
```

New configs should always extend `base.json` and only add environment-specific options.

---

## Naming Conventions

- Config files are named by their target environment: `base.json`, `react-app.json`, `node.json`
- Configs are plain JSON (not JS/TS) since `tsconfig.json` must be valid JSON
- The `display` field serves as a human-readable label
# Quality Guidelines

> TypeScript strictness and code quality standards enforced by `@zanelab/tsconfig`.

---

## Strictness Baseline

All configs inherit `strict: true` from `base.json`, which enables:

- `strictNullChecks`
- `strictFunctionTypes`
- `strictBindCallApply`
- `strictPropertyInitialization`
- `noImplicitAny`
- `noImplicitThis`
- `alwaysStrict`

There is no opt-out. Every package in the monorepo operates under full strict mode.

---

## Unused Code Detection

```json
"noUnusedLocals": true,
"noUnusedParameters": true,
```

Both are errors, not warnings:

- **`noUnusedLocals`** — unreferenced local variables cause a compilation error
- **`noUnusedParameters`** — unused function parameters cause a compilation error

If a parameter must remain unused (e.g., to satisfy an interface), prefix it with `_`:

```ts
// Correct — explicitly unused
function handler(_req: Request, res: Response) {
  res.send('ok');
}
```

---

## No Fallthrough

```json
"noFallthroughCasesInSwitch": true
```

Every `case` in a `switch` statement must either `break`, `return`, or `throw`. Accidental fallthrough is a compilation error.

```ts
// Correct
switch (status) {
  case 'active':
    return true;
  case 'inactive':
    return false;
  default:
    throw new Error(`Unknown status: ${status}`);
}

// Incorrect — compile error
switch (status) {
  case 'active':
    doSomething();
  case 'inactive':  // falls through
    doDefault();
}
```

---

## Module System

```json
"module": "ESNext",
"moduleResolution": "bundler",
"isolatedModules": true,
```

- **`module: "ESNext"`** — use the latest ES module syntax
- **`moduleResolution: "bundler"`** — resolve modules the same way Vite/esbuild does
- **`isolatedModules: true`** — each file must be independently transpilable; prohibits:
  - `const enum` (must use regular `enum`)
  - Namespace merging across files
  - Re-exports of types without the `type` keyword (`export { type Foo }`)

---

## Build Artifacts

```json
"noEmit": true,
"allowImportingTsExtensions": true,
```

- **`noEmit: true`** — TypeScript only type-checks; actual transpilation is done by Vite or esbuild
- **`allowImportingTsExtensions: true`** — allows `.ts` / `.tsx` extensions in import paths (required by Vite's dev server)

---

## Type Checking Speed

```json
"skipLibCheck": true,
"resolveJsonModule": true,
```

- **`skipLibCheck: true`** — skips type-checking `.d.ts` files from `node_modules` for faster builds
- **`resolveJsonModule: true`** — allows importing `.json` files with type inference

---

## Forbidden Patterns

### No `any`

With `strict: true`, `noImplicitAny` is enabled. Avoid explicit `any`; use `unknown` instead:

```ts
// Incorrect
function parse(input: any): any { ... }

// Correct
function parse(input: unknown): unknown { ... }
```

### No `const enum`

`isolatedModules: true` prevents `const enum`:

```ts
// Incorrect
const enum Color { Red, Green, Blue }

// Correct
enum Color { Red, Green, Blue }
```

### No bare type re-exports

```ts
// Incorrect — isolatedModules error
export { MyType } from './types';

// Correct
export type { MyType } from './types';
```

### No DOM types in Node packages

When creating a Node.js package, extend `node.json` which uses `lib: ["ES2023"]` without DOM:

```json
{
  "extends": "@zanelab/tsconfig/node.json"
}
```

### No Node types in React packages

When creating a React/vite package, extend `react-app.json` which uses `lib: ["ES2023", "DOM", "DOM.Iterable"]`:

```json
{
  "extends": "@zanelab/tsconfig/react-app.json"
}
```

---

## Choosing the Right Config

| Package Type | Config to Extend |
|---|---|
| React app, Vite frontend | `@zanelab/tsconfig/react-app.json` |
| Node.js API, CLI tool, shared lib (no DOM) | `@zanelab/tsconfig/node.json` |
| Config package, build tooling | `@zanelab/tsconfig/node.json` |
| Library consumed by both Node and browser | `@zanelab/tsconfig/base.json` + custom lib |
# Quality Guidelines

> Code quality standards for `@zanelab/iam-web`.

---

## Overview

This project has minimal quality infrastructure — no linter, no formatter config within the package, and no tests. Quality is enforced through TypeScript strict mode and the Vite build pipeline.

---

## Forbidden Patterns

### Never use `any`

TypeScript strict mode is enabled. Use `unknown` with type guards:

```tsx
// BAD
let props: any = {};

// GOOD — from src/main.tsx
export interface PltProps {
  [key: string]: unknown;
}
```

### Never use `@ts-ignore` or `@ts-expect-error`

All code must compile cleanly with `strict: true`. If TypeScript complains, fix the types, don't suppress the error.

### Never add CSS files

This project uses DaisyUI/Tailwind exclusively via class names. No `.css`, `.scss`, or `.module.css` files should be added.

```tsx
// CORRECT — DaisyUI classes
<div className="card bg-base-100 w-[28rem] shadow-xl">

// WRONG — inline styles or CSS imports
<div style={{ width: '28rem' }}>
import './styles.css';
```

### Never use default exports

The project convention is named exports:

```tsx
// CORRECT — from src/App.tsx
export function App() { ... }

// CORRECT — from src/main.tsx
export function getProps(): PltProps { ... }
export interface PltProps { ... }

// WRONG
export default function App() { ... }
```

### Never use arrow functions for top-level components

Use `function` declarations for components at module scope:

```tsx
// CORRECT
function SystemPage({ title }: { title: string }) { ... }

// WRONG
const SystemPage = ({ title }: { title: string }) => { ... };
```

Arrow functions are fine for inline handlers and callbacks:

```tsx
// CORRECT — inline handler
onChange={(e) => setInput(e.target.value)}
```

---

## Required Patterns

### Always use functional `useState` updaters when deriving from previous state

```tsx
// CORRECT
setMessages((m) => [...m, { role: 'user', text }]);

// WRONG (race condition with stale closure)
setMessages([...messages, { role: 'user', text }]);
```

### Always guard host-props access with runtime checks

Since `PltProps` uses an index signature, host-injected values need guards:

```tsx
// CORRECT
Array.isArray(props.permissions) ? props.permissions.length : 0
(props.basename as string | undefined) ?? '/system'

// WRONG (no guard — may crash)
props.permissions.length
```

### Always use the `@/*` path alias for src imports

```tsx
// CORRECT (if importing from src/)
import { App } from '@/App';

// The current codebase uses relative imports — either is acceptable
import { App } from './App';
```

---

## Testing Requirements

There are **no tests** in this project. No test runner (Vitest, Jest), no testing library (@testing-library/react), and no test scripts in `package.json`:

```jsonc
// apps/iam-web/package.json — no test-related scripts or dependencies
{
  "scripts": {
    "dev": "vite --port 8081",
    "build": "vite build",
    "dev:qiankun": "vite build --watch & vite preview --port 8081 --strictPort",
    "preview": "vite preview --port 8081 --strictPort"
  }
}
```

When tests are added:
1. Add `vitest` and `@testing-library/react` as devDependencies
2. Add a `test` script: `"test": "vitest run"`
3. Test components via `@testing-library/react` render + assertions
4. Test Qiangun lifecycle by mocking `vite-plugin-qiankun/dist/helper`

---

## Build & Dev Setup

### Development

```bash
# Standalone dev server on port 8081
pnpm --filter @zanelab/iam-web dev

# Qiangun-compatible dev (build + preview on port 8081)
pnpm --filter @zanelab/iam-web dev:qiankun
```

### Build

```bash
pnpm --filter @zanelab/iam-web build
```

The Vite config (`apps/iam-web/vite.config.ts`) includes:

1. **`@vitejs/plugin-react`** — React Fast Refresh and JSX transform
2. **`vite-plugin-qiankun`** — exports the app as `pa_new` with dev mode enabled
3. **Custom `inlineModuleScriptsToDynamicImport` plugin** — rewrites inline `<script type="module">` tags to dynamic `import()` calls for Qiangun compatibility
4. **CORS headers** — `Access-Control-Allow-Origin: *` on both dev server and preview
5. **Strict port** — `port: 8081` with `strictPort: true` (fails if port is taken)

---

## Code Review Checklist

- [ ] No `any` types introduced
- [ ] No `@ts-ignore` or `@ts-expect-error` comments
- [ ] No CSS files added — all styling via DaisyUI class names
- [ ] Named exports used (no default exports)
- [ ] Components are `function` declarations (not arrow functions at module scope)
- [ ] `useState` functional updaters used when deriving from previous state
- [ ] Host props accessed with runtime guards (`Array.isArray`, type assertions with fallbacks)
- [ ] `tsc --noEmit` passes with strict mode
- [ ] `vite build` completes without errors
- [ ] No test infrastructure added prematurely — only add when there is concrete test logic
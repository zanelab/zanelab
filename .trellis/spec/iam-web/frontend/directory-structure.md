# Directory Structure

> How frontend code is organized in `@zanelab/iam-web`.

---

## Overview

The `apps/iam-web/` package uses an intentionally flat source layout. With only 2 source files, there is no deep component/hook/utility directory tree. Everything lives under `src/` at the top level.

This is appropriate for a small micro-frontend sub-app where adding directory structure would be over-engineering.

---

## Directory Layout

```
apps/iam-web/
├── index.html              # SPA entry HTML — mounts a single <div id="root">
├── package.json            # @zanelab/iam-web, React 19, Vite 8, Qiankun
├── tsconfig.json           # TypeScript 6.0, strict, bundler resolution
├── vite.config.ts          # Vite plugins (React, Qiankun, inline-module rewrite)
└── src/
    ├── main.tsx            # Qiangun lifecycle, BrowserRouter, PltProps, standalone fallback
    └── App.tsx             # Routes, SystemPage, ChatPage, inline component definitions
```

There are no subdirectories under `src/` — no `components/`, `hooks/`, `utils/`, or `pages/` directories.

---

## Module Organization

All components are defined **inline in `src/App.tsx`** as function declarations at module scope. This is the project's convention — there is no separate component-per-file structure. Components include:

- `SystemPage` — renders a DaisyUI card showing the page title, current route, and host-props info
- `ChatPage` — renders a chat interface with local state for messages and input
- `App` — the route root, maps URL paths to components via `<Routes>`

The lifecycle/initialization logic lives in `src/main.tsx`:

- `PltProps` interface — defines the shape of host-injected props
- `getProps()` — returns the current saved props (used by components to read host data)
- `render()` — creates a React root and mounts the app inside a `BrowserRouter` with `basename`
- `renderWithQiankun()` — exports bootstrap/mount/update/unmount hooks
- Standalone fallback — when `qiankunWindow.__POWERED_BY_QIANKUN__` is falsy, the app renders without a micro-frontend host

---

## Naming Conventions

- Source files: **PascalCase** for component-exporting files (`App.tsx`, not strictly enforced since the entry is `main.tsx`)
- Component names: **PascalCase** (`SystemPage`, `ChatPage`, `App`)
- Interface names: **PascalCase** (`PltProps`, `Msg`)
- Functions: **camelCase** (`render`, `send`, `getProps`)
- Exports: **named exports** preferred (`export function App`, `export function getProps`)

---

## Examples

The entire `src/` directory is the best example — it consists of only 2 files:

- `apps/iam-web/src/main.tsx` — the entry point and Qiangun integration
- `apps/iam-web/src/App.tsx` — all routes and components
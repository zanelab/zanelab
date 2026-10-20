# Frontend Development Guidelines

> React component conventions for `@zanelab/ui`.

---

## Overview

`@zanelab/ui` is a React 19 component library built with DaisyUI + Tailwind v4. Components are pure, stateless, and exported individually from a barrel `index.ts`.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Component organization and file layout | Filled |
| [Component Guidelines](./component-guidelines.md) | Component patterns, props, styling | Filled |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, forbidden patterns | Filled |

---

## Package Identity

- **Name:** `@zanelab/ui`
- **Location:** `packages/ui/`
- **Module type:** ESM (`"type": "module"`)
- **Exports:**
  - `".": "./src/index.ts"` — main entry (React components)
  - `"./scrollbar.css": "./src/scrollbar/scrollbar.css"` — CSS sidecar
- **Peer dependencies:** `react: ^19`, `react-dom: ^19`
- **Internal dependency:** `@zanelab/utils`
- **Styling:** DaisyUI + Tailwind v4

---

## Component Catalog

| Component | File | Pattern |
|-----------|------|---------|
| `AnchoredPortal` | `src/anchored-portal.tsx` | Portal to `document.body` with positioning |
| `ToastRegion` | `src/ToastRegion.tsx` | DaisyUI toast + `notify` pub/sub from `@zanelab/utils` |
| `Logo` | `src/logo/logo.tsx` | Logo display with light/dark theme support |
| `Scrollbar` | `src/scrollbar/scrollbar.tsx` | Scroll container with overflow shadows + CSS export |
| `Block` | `src/form/block.tsx` | Form section wrapper |
| `ToggleItem` | `src/form/toggle-item.tsx` | Segmented button group for form selections |

---

**Language:** All documentation should be written in **English**.
# Directory Structure

> How `@zanelab/ui` components are organized.

---

## Overview

Components live in a **flat `src/` with subdirectories for grouped components**. Each component directory has its own barrel `index.ts`. The root `index.ts` re-exports everything.

---

## Directory Layout

```
packages/ui/
├── package.json
└── src/
    ├── index.ts                     # barrel: re-exports all components
    ├── anchored-portal.tsx          # AnchoredPortal (single file component)
    ├── ToastRegion.tsx              # ToastRegion (single file component)
    ├── logo/
    │   ├── index.ts                 # barrel: export * from './logo'
    │   └── logo.tsx                 # Logo component
    ├── scrollbar/
    │   ├── index.ts                 # barrel: export * from './scrollbar'
    │   ├── scrollbar.tsx            # Scrollbar component
    │   └── scrollbar.css            # CSS exported as "./scrollbar.css" in package.json
    └── form/
        ├── index.ts                 # barrel: export * from './block', './toggle-item'
        ├── block.tsx                # Block component
        └── toggle-item.tsx          # ToggleItem component
```

---

## Component Organization Rules

### Single-file components
A component with no sub-assets (CSS, tests, utils) lives as a single `.tsx` file in `src/`:
```
src/
├── anchored-portal.tsx
└── ToastRegion.tsx
```

### Multi-file components
A component with a CSS sidecar, test file, or sub-components gets its own directory:
```
src/
└── scrollbar/
    ├── index.ts         # barrel re-export
    ├── scrollbar.tsx    # component implementation
    └── scrollbar.css    # component styles
```

### Form components (grouped)
The `form/` directory groups related low-level form components, each as its own `.tsx`:
```
src/
└── form/
    ├── index.ts
    ├── block.tsx
    └── toggle-item.tsx
```

---

## Naming Conventions

- **Component files:** `kebab-case.tsx` for directories, `PascalCase.tsx` for standalone files
  - `anchored-portal.tsx` — single file in `src/`
  - `ToastRegion.tsx` — single file in `src/`
  - `scrollbar/scrollbar.tsx` — inside a directory
- **CSS sidecars:** same name as component — `scrollbar.css`
- **Barrel exports:** always `index.ts`, uses `export * from './file'` or named re-exports

---

## Barrel Export Pattern

Root `src/index.ts`:
```ts
export { AnchoredPortal } from './anchored-portal';
export { ToastRegion } from './ToastRegion';
export * from './logo';
export * from './scrollbar';
export * from './form';
```

Directory barrel (`src/form/index.ts`):
```ts
export * from './block';
export * from './toggle-item';
```

Component barrel (`src/logo/index.ts`):
```ts
export * from './logo';
```

---

**Language:** All documentation should be written in **English**.
# Quality Guidelines

> Code quality standards for `@zanelab/ui`.

---

## Overview

`@zanelab/ui` is a React 19 component library. Quality focuses on component structure, accessibility, and DaisyUI/Tailwind usage.

---

## Forbidden Patterns

- **`export default`** — always use named function exports: `export function ComponentName`
- **Class components** — always use function components
- **Inline styles** — use DaisyUI/Tailwind classes; inline styles only for computed pixel values (positioning, dimensions)
- **`any` prop types** — every prop must have an explicit type
- **Importing `React` namespace** — only import individual hooks and types: `import { useState } from 'react'`
- **Prop spreading** — destructure all props explicitly
- **Uncontrolled components** — all components should be controlled via props

---

## Required Patterns

- Props interface named `<ComponentName>Props`, defined in the same file
- Named function export: `export function ComponentName({ ... }: Props)`
- DaisyUI semantic classes for visual states (alert, btn, badge, etc.)
- Tailwind utility classes for layout, spacing, and typography
- Conditional classNames via template literals or array filters
- Side-effect imports from `@zanelab/utils` centralized in barrel `index.ts`

---

## Testing Requirements

- Visual correctness verified via manual review (no screenshot tests configured)
- Type correctness: `pnpm typecheck`
- Lint: `pnpm lint` (oxlint)

---

## Code Review Checklist

- [ ] Named function export, not default
- [ ] Props typed with interface in the same file
- [ ] No inline styles except for computed values
- [ ] DaisyUI classes used for semantic states
- [ ] Accessible: `aria-` attributes on interactive elements
- [ ] React 19 patterns: no manual `import React`
- [ ] Component barrel added to `src/index.ts`

---

**Language:** All documentation should be written in **English**.
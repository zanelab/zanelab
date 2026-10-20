# Type Safety

> Type safety patterns for `@zanelab/utils` frontend utilities.

---

## Overview

Frontend utilities in `@zanelab/utils` use TypeScript generics, discriminated return types, and proper narrowing for type safety.

---

## Type Organization

Types are defined alongside their utilities in the same file. Complex types referenced from `@zanelab/types` are imported with `import type`:

```ts
import type { MenuRecordRaw } from '@zanelab/types';
```

Local types (interfaces, type aliases) stay in the utility file:

```ts
export type MenuRecordWithParents = MenuRecordRaw & { parents: string[] };
```

---

## Common Patterns

### Recursive Tree Search with Generics

**From `packages/utils/src/find-menu-by-path.ts`:**

```ts
import type { MenuRecordRaw } from '@zanelab/types';

export type MenuRecordWithParents = MenuRecordRaw & { parents: string[] };

function findMenuByPath(
  menus: MenuRecordRaw[],
  path?: string,
  parents: string[] = [],
): MenuRecordWithParents | undefined {
  for (const menu of menus) {
    if (menu.path === path) {
      return { ...menu, parents: menu.parents ?? parents };
    }
    if (menu.children && menu.children.length > 0) {
      const found = findMenuByPath(menu.children, path, [...parents, menu.path]);
      if (found) return found;
    }
  }
  return undefined;
}
```

**Rules:**
- Return `T | undefined` for "not found" (not `null`)
- Spread operator for immutability: `{ ...menu, parents: ... }`
- Recursive with accumulating state (parents array)
- Guard `menu.children && menu.children.length > 0` before recursion

### Intersection Types for Extended Records

```ts
export type MenuRecordWithParents = MenuRecordRaw & { parents: string[] };
```

Use intersection (`&`) to extend imported types with local fields.

---

### Factory Return Type Inference

**From `packages/utils/src/find-menu-by-path.ts`:**

```ts
function findRootMenuByPath(menus: MenuRecordRaw[], path?: string, level = 0) {
  const findMenu = findMenuByPath(menus, path);
  const rootMenuPath = findMenu?.parents?.[level];
  const rootMenu = rootMenuPath
    ? menus.find((item) => item.path === rootMenuPath)
    : undefined;
  return { findMenu, rootMenu, rootMenuPath };
}
```

Return type is inferred from the return statement — no explicit annotation needed for simple object returns.

### Map Transformation

```ts
function withParents(
  menus: MenuRecordRaw[],
  parents: string[] = [],
): MenuRecordWithParents[] {
  return menus.map((menu) => ({
    ...menu,
    parents: menu.parents ?? parents,
    children: menu.children
      ? withParents(menu.children, [...parents, menu.path])
      : undefined,
  }));
}
```

---

## syncNavigate Pattern

**From `packages/utils/src/sync-navigate.ts`:**

```ts
import { flushSync } from 'react-dom';

export function syncNavigate(
  navigate: (to: string, options?: { replace?: boolean }) => void,
  to: string,
  options?: { replace?: boolean },
): void {
  flushSync(() => navigate(to, options));
}
```

**Rules:**
- Function signature mirrors the wrapped API
- `flushSync` from `react-dom` for synchronous React 19 updates
- Void return type (`: void`)

---

## Forbidden Patterns

- **`any` in generic types** — use `unknown` or properly constrained generics
- **`as` type assertions** — trust the type system
- **Mutable map/filter without spread** — always use spread for new objects
- **Exporting untyped functions** — every function should have explicit parameter and return types

---

**Language:** All documentation should be written in **English**.
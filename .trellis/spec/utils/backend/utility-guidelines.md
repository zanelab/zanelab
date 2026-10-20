# Utility Guidelines

> Patterns for writing utility functions and singletons in `@zanelab/utils`.

---

## Overview

This package uses three design patterns for its modules: **pure functions**, **module-level singletons**, and **thin wrappers** around third-party libraries.

---

## Pattern 1: Pure Functions

Most utilities are pure functions — they take input, return output, and have no side effects.

**Example from `packages/utils/src/locale.ts`:**

```ts
export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const;

export function normalizeLocale(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const bcp47 = value.trim().replace(/_/g, '-');
  if (!bcp47) return undefined;
  return SUPPORTED_LOCALES.find(
    (locale) => locale.toLowerCase() === bcp47.toLowerCase(),
  );
}

export function toLegacyLocale(locale: string): string {
  return locale.replace(/-/g, '_');
}
```

**Example from `packages/utils/src/diff.ts`:**

```ts
function diff<T extends Record<string, any>>(
  obj1: T,
  obj2: T,
): Record<string, any> | undefined {
  function findDifferences(o1: any, o2: any): any {
    if (Array.isArray(o1) && Array.isArray(o2)) {
      if (!arraysEqual(o1, o2)) return o2;
      return undefined;
    }
    // recursive object comparison...
  }
  return findDifferences(obj1, obj2);
}
```

**Rules:**
- Export with `export function` or `export const`
- Return `undefined` or `null` for invalid/missing results (don't throw)
- Use generics (`<T>`) for type-safe containers
- Accept `unknown` input and narrow with type guards

---

## Pattern 2: Module-Level Singleton

For shared state that multiple components consume, use a module-level object with internal closures.

**Example from `packages/utils/src/notify.ts`:**

```ts
export type NotifyLevel = 'success' | 'error' | 'warning' | 'info';

export interface NotifyMessage {
  id: number;
  level: NotifyLevel;
  message: string;
}

type Listener = (msg: NotifyMessage) => void;

const PENDING_LIMIT = 5;

let seq = 0;
const listeners = new Set<Listener>();
const pending: NotifyMessage[] = [];

function publish(level: NotifyLevel, message: string) {
  const msg: NotifyMessage = { id: ++seq, level, message };
  if (listeners.size === 0) {
    pending.push(msg);
    if (pending.length > PENDING_LIMIT) pending.shift();
    return;
  }
  listeners.forEach((listener) => listener(msg));
}

export const notify = {
  error(message: string) { publish('error', message); },
  success(message: string) { publish('success', message); },
  warning(message: string) { publish('warning', message); },
  info(message: string) { publish('info', message); },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    if (pending.length > 0) {
      const backlog = pending.splice(0, pending.length);
      backlog.forEach((msg) => listener(msg));
    }
    return () => { listeners.delete(listener); };
  },
};
```

**Example from `packages/utils/src/cache.ts`:**

```ts
interface CacheEntry {
  __timeout: number;
  __data: unknown;
}

const PREFIX = 'cache_';

export const cache = {
  get<T = unknown>(key: string): T | null {
    const data = localStorage.getItem(PREFIX + key);
    try {
      if (!data) return null;
      return (JSON.parse(data) as CacheEntry)?.__data as T;
    } catch {
      return null;
    }
  },

  set(key: string, value: unknown, hours = 24): void {
    const timeout = Date.now() + hours * 3600 * 1000;
    const entry: CacheEntry = { __timeout: timeout, __data: value };
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  },

  remove(key: string): void {
    if (!key) return;
    localStorage.removeItem(PREFIX + key);
  },
};
```

**Rules:**
- State lives in module-level `let`/`const` (private, not exported)
- The singleton is `export const` (read-only at import site)
- Methods operate on the closed-over module state
- `subscribe()` returns an unsubscribe function (cleanup pattern)
- Internal state uses `Set` for listeners (no duplicates) and `Map` for keyed lookups

---

## Pattern 3: Thin Third-Party Wrappers

Some modules wrap third-party libraries with a project-specific API.

**Example from `packages/utils/src/nprogress.ts`:**

```ts
import NProgress from 'nprogress';

NProgress.configure({
  showSpinner: true,
  speed: 300,
});

export function startProgress() {
  NProgress.start();
}

export function stopProgress() {
  NProgress.done();
}
```

**Example from `packages/utils/src/color.ts`:**

```ts
import { TinyColor } from '@ctrl/tinycolor';
import { getColors } from 'theme-colors';

export function isValidColor(color?: string): boolean {
  if (!color) return false;
  return new TinyColor(color).isValid;
}

export function convertToHsl(color: string): string {
  const { a, h, l, s } = new TinyColor(color).toHsl();
  const hsl = `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
  return a < 1 ? `${hsl} ${a}` : hsl;
}
```

**Rules:**
- Configure third-party libraries at module level (`NProgress.configure(...)`)
- Export thin functions that map to library calls
- Never re-export the third-party library directly — always wrap
- Handle edge cases (e.g., `isValidColor` returns `false` for empty string)
- Normalize data before passing to the library (`str.replaceAll(...)` before `new TinyColor`)

---

## File Organization

Each utility file follows this structure:

```
// 1. Imports (from external deps, internal packages)
// 2. Type definitions (interfaces, type aliases)
// 3. Module-level state (for singletons)
// 4. Private functions (not exported)
// 5. Public exports (functions, constants, singletons)
```

---

## Forbidden Patterns

- **Classes** — use functions or constant objects
- **`new` keyword** in public API — factory functions or singletons preferred
- **Exporting mutable module state** — only export read-only views
- **Mixing React and non-React in the same file** — `sync-navigate.ts` and `find-menu-by-path.ts` are React-specific and live in this package; keep them separate from platform-agnostic files

---

**Language:** All documentation should be written in **English**.
# Type Definition Guidelines

> How to define and organize TypeScript types in `@zanelab/types`.

---

## Overview

This package uses three patterns for defining types:

1. **Zod-first inference** for validated data (config, API shapes)
2. **Union type enums** for constrained string choices (layout modes, themes)
3. **Interface definitions** for object shapes consumed by components (menu, user)

---

## Zod-First Inference

Every config section is defined as a Zod schema first; the TypeScript type is derived via `z.infer`.

**From `packages/types/src/config.ts`:**

```ts
export const AppConfigSchema = z.object({
  version: z.string(),
  system: SystemConfigSchema,
  auth: AuthConfigSchema,
  api: ApiConfigSchema,
  route: RouteConfigSchema,
  layout: LayoutConfigSchema,
  preferences: PreferencesConfigSchema,
  session: SessionConfigSchema,
  microApps: z.record(z.string(), MicroAppConfigSchema).default({}),
  icons: z.record(z.string(), IconDataSchema).default({}),
  i18n: I18nConfigSchema.default({ packUrls: {} }),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
```

**Rules:**
- Schema variable: `PascalCase` + `Schema` suffix (`AppConfigSchema`)
- Inferred type: same PascalCase, no suffix (`AppConfig`)
- Always `export const` the schema
- Always `export type` the inferred type

---

## Union Type Enums

Use string literal unions for constrained choices. Prefer `type` over `enum`.

**From `packages/types/src/layout.ts`:**

```ts
export type LayoutMode =
  | 'sidebar-nav'
  | 'mixed-nav'
  | 'sidebar-mixed-nav'
  | 'header-nav'
  | 'full-content'
  | 'header-mixed-nav'
  | 'header-sidebar-nav';

export type SidebarTheme = 'dark' | 'light';

export type BuiltinThemeType =
  | 'custom' | 'deep-blue' | 'deep-green' | 'default'
  | 'gray' | 'green' | 'neutral' | 'orange'
  | 'pink' | 'rose' | 'sky-blue' | 'slate'
  | 'violet' | 'yellow' | 'zinc';
```

**Rules:**
- Use `type`, never `enum` (better tree-shaking, composition)
- Multi-variant unions: one variant per line with leading `|`
- Two-value unions: single line is fine
- Always `export type`

---

## Interface Definitions

Use interfaces for object shapes consumed by React components or tree structures.

**From `packages/types/src/index.ts`:**

```ts
export interface MenuItem {
  id: number;
  name: string;
  icon?: string;
  path: string;
  appName?: string;
  permission?: string;
  component?: string;
  i18nKey?: string;
  menuType?: 'normal' | 'user-dropdown';
  type?: 'app' | 'menu' | 'button' | 'group';
  children?: MenuItem[];  // recursive
}
```

**From `packages/types/src/menu.ts`:**

```ts
export interface MenuRecordRaw {
  path: string;
  name: string;
  icon?: string | ReactNode;
  activeIcon?: string | ReactNode;
  parents?: string[];
  badge?: string | number;
  badgeType?: string;
  badgeVariants?: string;
  query?: Record<string, unknown>;
  children?: MenuRecordRaw[];  // recursive tree
  meta?: {
    title: string;
    hideInMenu?: boolean;
    hideInBreadcrumb?: boolean;
    hideInTab?: boolean;
    activePath?: string;
    badge?: string;
    badgeType?: string;
    icon?: string;
    order?: number;
  };
}
```

**Rules:**
- Use `interface` (not `type`) for object shapes — better IDE tooltips
- Use `Record<string, unknown>` for arbitrary bag properties
- Optional properties marked with `?`
- Recursive structures allowed (e.g., `children?: SameType[]`)
- Import `ReactNode` for icon/child slots: `import type { ReactNode } from 'react'`

---

## Ambient Module Declarations

For untyped third-party modules, use `declare module` in `.d.ts` files.

**From `packages/types/src/sm-crypto.d.ts`:**

```ts
declare module 'sm-crypto' {
  export const sm4: {
    encrypt(
      plaintext: string,
      key: string,
      options?: { mode?: 'ECB' | 'CBC' },
    ): string;
    decrypt(
      ciphertext: string,
      key: string,
      options?: { mode?: 'ECB' | 'CBC' },
    ): string;
  };
}
```

**Rules:**
- File extension: `.d.ts`
- Reference from `index.ts` with `/// <reference path="./module.d.ts" />`
- Declare only the parts of the module you actually use
- Use `export const` for module-level exports (not `export function`)

---

## Forbidden Patterns

- **`enum` keyword** — use union types instead
- **`any`** — never use; use `unknown` if truly dynamic
- **`type` for objects** — use `interface`; `type` is for unions/intersections only
- **Default exports** — always use named exports

---

**Language:** All documentation should be written in **English**.
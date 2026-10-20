# Frontend Development Guidelines

> React-facing type conventions for `@zanelab/types`.

---

## Overview

`@zanelab/types` is a pure types/schema package. Its "frontend" layer describes how types are consumed by React applications. There are no components, hooks, or state management — this layer focuses on type patterns used at the React boundary.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Module organization and file layout | Filled |
| [Type Safety](./type-safety.md) | Type patterns, Zod validation | Filled |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, forbidden patterns | Filled |

---

## How React Apps Consume These Types

Types from `@zanelab/types` are consumed via:

```ts
import type { MenuRecordRaw, MenuProps, LayoutCoreProps, AppConfig } from '@zanelab/types';
```

The `import type` syntax ensures types are erased at compile time. The Zod schemas are imported at runtime when validation is needed:

```ts
import { AppConfigSchema } from '@zanelab/types';
```

---

**Language:** All documentation should be written in **English**.
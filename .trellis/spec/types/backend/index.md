# Backend Development Guidelines

> Type definitions and schema conventions for `@zanelab/types`.

---

## Overview

`@zanelab/types` is a **pure types/schema package** with no runtime logic, no database, and no logging. It exports TypeScript types, interfaces, and Zod schemas consumed by other packages in the monorepo. Its "backend" layer refers to the type and schema authoring side — the shape of data flowing through the system.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Module organization and file layout | Filled |
| [Type Definition Guidelines](./type-definition-guidelines.md) | How to write type definitions and interfaces | Filled |
| [Schema Guidelines](./schema-guidelines.md) | Zod schema patterns and best practices | Filled |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, forbidden patterns | Filled |

---

## Package Identity

- **Name:** `@zanelab/types`
- **Location:** `packages/types/`
- **Module type:** ESM (`"type": "module"`)
- **Exports:** `".": "./src/index.ts"` — single barrel export
- **Dependencies:** `zod`, `@types/react` (dev)
- **No runtime code:** This package has zero runtime behavior

---

**Language:** All documentation should be written in **English**.
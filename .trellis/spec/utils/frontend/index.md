# Frontend Development Guidelines

> React-specific utility conventions for `@zanelab/utils`.

---

## Overview

`@zanelab/utils` has a small set of React-specific utilities. The "frontend" layer describes these utilities and their patterns. There are no components, hooks, or state management — just utility functions that depend on React or `react-dom`.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Module organization and file layout | Filled |
| [Type Safety](./type-safety.md) | Type patterns for utility functions | Filled |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, forbidden patterns | Filled |

---

## React-Specific Utilities

| Module | Dependency | Purpose |
|--------|------------|---------|
| `sync-navigate.ts` | `react-dom` | Synchronous route navigation via `flushSync` |
| `find-menu-by-path.ts` | `@zanelab/types` | Recursive menu tree search with parent tracking |

---

**Language:** All documentation should be written in **English**.
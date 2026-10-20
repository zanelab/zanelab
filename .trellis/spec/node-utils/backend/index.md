# Backend Development Guidelines

> Node.js tooling conventions for `@zanelab/node-utils`

---

## Overview

`@zanelab/node-utils` (`tooling/node-utils/`) is a **Node.js-only** utility package used across the monorepo for CLI scripts, build tooling, and developer workflows. It has no browser code, no database, and no HTTP server.

Key characteristics:
- Written in **TypeScript 6.0**, compiled with `@zanelab/tsconfig/node.json`
- **ESM** (`"type": "module"` in `package.json`)
- Tests with **Vitest 5**, linted with **oxlint**
- Async-first: all I/O functions return Promises
- Monorepo-aware: utilities for finding monorepo root, listing packages

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Source layout and file organization | Filled |
| [Quality Guidelines](./quality-guidelines.md) | Testing, linting, forbidden patterns | Filled |
| [Error Handling](./error-handling.md) | CLI/tooling error patterns | Filled |
| [Tooling Patterns](./tooling-patterns.md) | Monorepo utils, convenience re-exports, spinner | Filled |

---

**Language**: All documentation should be written in **English**.
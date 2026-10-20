# TypeScript Configuration Guidelines

> TypeScript compiler options for the monorepo.

---

## Overview

This directory contains conventions for `@zanelab/tsconfig`, the shared TypeScript configuration used across the monorepo. The configs live under `tooling/tsconfig/` and each consumer package extends the appropriate config in its own `tsconfig.json`.

Three configs are provided, each targeting a different runtime environment.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Config structure and how to extend | Filled |
| [Quality Guidelines](./quality-guidelines.md) | Compiler strictness and code quality | Filled |

---

## Quick Reference: Three Configs

### `base.json`

The foundational config shared by all packages:

- **Target**: ES2023
- **Module**: ESNext with bundler resolution
- **Strictness**: `strict: true`, `noUnusedLocals`, `noUnusedParameters`
- **Output**: `noEmit: true` (bundler handles output)

### `react-app.json`

For React applications and Vite-based frontends:

- Extends `base.json`
- Adds DOM, DOM.Iterable libs
- JSX mode: `react-jsx`
- Includes `vite/client` types
- Enables `useDefineForClassFields`

### `node.json`

For Node.js backend packages and tooling:

- Extends `base.json`
- Uses ES2023 lib (no DOM)
- Includes `node` types

---

**Language**: English.
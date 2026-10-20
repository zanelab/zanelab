# Frontend Development Guidelines

> `@zanelab/node-utils` has **no frontend layer**.

---

## Overview

`@zanelab/node-utils` (`tooling/node-utils/`) is a **Node.js-only** utility package. It provides file-system helpers, process execution, git utilities, monorepo tooling, and CLI UX primitives — all designed for server-side and build-tool use.

There are no:
- React/Vue/Svelte components
- Browser-side code
- CSS or styling
- State management
- Hooks
- DOM utilities

If you need browser-side utilities, check `packages/` or other workspace packages for frontend-specific tooling.

---

## Guidelines Index

No frontend guidelines apply. This directory exists only to satisfy the Trellis spec structure; all development guidelines are in [`../backend/`](../backend/).

---

**Language**: All documentation should be written in **English**.
# Frontend Development Guidelines

> Best practices for frontend development in the `@zanelab/iam-web` package (`apps/iam-web/`).

---

## Overview

This directory contains guidelines for frontend development in the `iam-web` package -- a Qiangun micro-frontend SPA built with React 19, React Router 7, Vite 8, TypeScript 6.0, and DaisyUI. All guidelines are backed by the actual codebase.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Flat 2-file src/ structure | Filled |
| [Component Guidelines](./component-guidelines.md) | Inline component patterns, DaisyUI usage, single-file structure | Filled |
| [Hook Guidelines](./hook-guidelines.md) | React hooks used (useState, useLocation) | Filled |
| [State Management](./state-management.md) | Local React state, getProps() for host data | Filled |
| [Type Safety](./type-safety.md) | TypeScript 6.0 patterns, PltProps interface | Filled |
| [Quality Guidelines](./quality-guidelines.md) | Build setup, Vite config, no test infrastructure | Filled |

---

## How to Fill These Guidelines

For each guideline file:

1. Document your project's **actual conventions** (not ideals)
2. Include **code examples** from your codebase
3. List **forbidden patterns** and why
4. Add **common mistakes** your team has made

The goal is to help AI assistants and new team members understand how YOUR project works.

---

**Language**: All documentation should be written in **English**.
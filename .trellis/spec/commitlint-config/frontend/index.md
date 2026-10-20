# Commitlint Configuration Guidelines

> Commit message conventions and enforcement for the monorepo.

---

## Overview

This directory contains conventions for `@zanelab/commitlint-config`, the shared commitlint configuration used across the entire monorepo. The config lives at `tooling/commitlint-config/index.mjs` and is consumed by the root `commitlint.config.ts`.

The configuration enforces [Conventional Commits](https://www.conventionalcommits.org/) format, validates scopes against actual monorepo packages, and provides interactive commit prompts through cz-git.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Config package layout and dependencies | Filled |
| [Quality Guidelines](./quality-guidelines.md) | Commit quality rules and enforcement | Filled |

---

## Quick Reference: Commit Format

```
type(scope): description

body (optional)

footer (optional)
```

### Valid Types

`feat`, `fix`, `perf`, `style`, `docs`, `test`, `refactor`, `build`, `ci`, `chore`, `revert`, `types`, `release`, `workflow`

### Scope Rules

Scope must be one of:

- A monorepo package name (dynamically discovered via `@zanelab/node-utils` `getPackagesSync()`)
- A fixed scope: `project`, `task`, `style`, `lint`, `ci`, `dev`, `deploy`, `other`

### Limits

- Header max length: **108 characters**
- Subject cannot be empty
- Type cannot be empty
- body-leading-blank: always required
- footer-leading-blank: always required (warning)

---

**Language**: English.
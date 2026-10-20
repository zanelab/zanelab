# Stylelint Configuration Guidelines

> CSS/SCSS linting conventions for the monorepo.

---

## Overview

This directory contains conventions for `@zanelab/stylelint-config`, the shared Stylelint configuration used across the monorepo. The config lives at `tooling/stylelint-config/index.mjs` and the root `stylelint.config.mjs` re-exports it.

The configuration handles CSS, SCSS, and Vue single-file component styles with rules for ordering, BEM naming, Tailwind/Sass at-rule support, and Prettier integration.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Config package layout and dependencies | Filled |
| [Quality Guidelines](./quality-guidelines.md) | CSS linting rules and enforcement | Filled |

---

## Quick Reference: Architecture

### Extends

- `stylelint-config-standard` — standard CSS rules
- `stylelint-config-recess-order` — property ordering

### Plugins

- `stylelint-order` — CSS declaration/property ordering
- `@stylistic/stylelint-plugin` — stylistic formatting rules
- `stylelint-prettier` — Prettier integration as a lint rule
- `stylelint-scss` — SCSS-specific rules

### Overrides

- **Vue/HTML files**: `postcss-html` custom syntax, Vue-specific pseudo-class/element allowances
- **SCSS files**: `postcss-scss` custom syntax, extends `stylelint-config-recommended-scss` and `stylelint-config-recommended-vue/scss`

---

**Language**: English.
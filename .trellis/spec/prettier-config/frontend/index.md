# Prettier Configuration Guidelines

> Code formatting conventions for the monorepo.

---

## Overview

This directory contains conventions for `@zanelab/prettier-config`, the shared Prettier configuration used across the entire monorepo. The config lives at `tooling/prettier-config/index.mjs` and all packages reference it via their `prettier` field in `package.json`.

The configuration provides consistent formatting for all file types and includes Tailwind CSS class sorting.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Config package layout and dependencies | Filled |
| [Quality Guidelines](./quality-guidelines.md) | Formatting standards and enforcement | Filled |

---

## Quick Reference: Formatting Rules

| Option | Value | Purpose |
|--------|-------|---------|
| `printWidth` | 80 | Maximum line width before wrapping |
| `semi` | true | Always add semicolons |
| `singleQuote` | true | Use single quotes (except JSX) |
| `trailingComma` | 'all' | Add trailing commas everywhere possible |
| `endOfLine` | 'auto' | Preserve existing line endings |
| `proseWrap` | 'never' | Never wrap prose (Markdown, etc.) |

### Plugins

- `prettier-plugin-tailwindcss` — sorts Tailwind CSS utility classes

### Override: JSON5

```js
{
  files: ['*.json5'],
  options: {
    quoteProps: 'preserve',
    singleQuote: false,
  },
}
```

JSON5 files preserve their property quoting style and use double quotes.

---

**Language**: English.
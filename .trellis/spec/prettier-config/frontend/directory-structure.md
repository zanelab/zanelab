# Directory Structure

> How `@zanelab/prettier-config` is organized.

---

## Package Layout

```
tooling/prettier-config/
├── index.mjs          # Prettier config (the single source file)
└── package.json       # Package metadata and dependencies
```

Each consumer package references this config in its `package.json`:

```json
{
  "prettier": "@zanelab/prettier-config"
}
```

The root `.prettierrc.mjs` re-exports it:

```js
import config from './tooling/prettier-config/index.mjs';
export default config;
```

---

## `index.mjs` — Config Structure

The config is a default-exported object with these top-level keys:

### Core Options

```js
export default {
  printWidth: 80,
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  endOfLine: 'auto',
  proseWrap: 'never',
  plugins: ['prettier-plugin-tailwindcss'],
  overrides: [/* ... */],
};
```

### `plugins`

- `prettier-plugin-tailwindcss` — sorts Tailwind utility classes following the recommended class order

### `overrides`

Single override for JSON5 files:

```js
{
  files: ['*.json5'],
  options: {
    quoteProps: 'preserve',
    singleQuote: false,
  },
}
```

This ensures JSON5 files (commonly used in VSCode settings, tsconfig extensions, etc.) keep their double-quoted property style and don't get single-quoted by Prettier.

---

## Dependencies

| Dependency | Purpose |
|---|---|
| `prettier` | Core formatter |
| `prettier-plugin-tailwindcss` | Sorts Tailwind utility classes |

No dev dependencies — the package purely exports the config object and its consumers bring their own Prettier.

---

## Naming Conventions

- Config is a default export from `index.mjs`
- Consumed as a preset string: `"prettier": "@zanelab/prettier-config"`
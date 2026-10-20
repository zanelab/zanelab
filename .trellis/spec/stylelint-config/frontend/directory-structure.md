# Directory Structure

> How `@zanelab/stylelint-config` is organized.

---

## Package Layout

```
tooling/stylelint-config/
├── index.mjs          # Stylelint config (the single source file)
└── package.json       # Package metadata and dependencies
```

The root `stylelint.config.mjs` re-exports it:

```js
import config from './tooling/stylelint-config/index.mjs';
export default config;
```

---

## `index.mjs` — Config Structure

The config is a default-exported object with these top-level sections:

### `extends`

```js
extends: ['stylelint-config-standard', 'stylelint-config-recess-order'],
```

Uses the standard CSS ruleset plus Recess-style property ordering as a baseline.

### `plugins`

```js
plugins: [
  'stylelint-order',
  '@stylistic/stylelint-plugin',
  'stylelint-prettier',
  'stylelint-scss',
],
```

### `ignoreFiles`

```js
ignoreFiles: [
  '**/*.js', '**/*.jsx', '**/*.tsx', '**/*.ts',
  '**/*.json', '**/*.md',
],
```

Stylelint skips all JavaScript/TypeScript/JSON/Markdown files entirely.

### `overrides`

Two override blocks targeting different file types:

1. **Vue/HTML files** (`*.(html|vue)`) — uses `postcss-html` custom syntax with Vue-specific pseudo-class (`global`, `deep`) and pseudo-element (`v-deep`, `v-global`, `v-slotted`) allowances.

2. **SCSS files** (`*.scss`) — uses `postcss-scss` custom syntax and extends:
   - `stylelint-config-recommended-scss`
   - `stylelint-config-recommended-vue/scss`

### `rules`

See [Quality Guidelines](./quality-guidelines.md) for the full rule reference.

---

## Dependencies

### Production (`dependencies`)

| Dependency | Purpose |
|---|---|
| `@stylistic/stylelint-plugin` | Stylistic formatting rules |
| `stylelint-config-recess-order` | Recess-style property ordering preset |
| `stylelint-scss` | SCSS-specific lint rules |

### Development (`devDependencies`)

| Dependency | Purpose |
|---|---|
| `postcss`, `postcss-html`, `postcss-scss` | Custom syntax parsers for Vue and SCSS |
| `prettier` | Required by `stylelint-prettier` |
| `stylelint` | Core Stylelint engine |
| `stylelint-config-recommended` | Base recommended rules |
| `stylelint-config-recommended-scss` | SCSS-specific recommended rules |
| `stylelint-config-recommended-vue` | Vue-specific recommended rules |
| `stylelint-config-standard` | Standard CSS rules baseline |
| `stylelint-order` | CSS property ordering plugin |
| `stylelint-prettier` | Prettier integration as Stylelint rule |

---

## Naming Conventions

- Config is a default export from `index.mjs`
- Consumed by root-level `stylelint.config.mjs`
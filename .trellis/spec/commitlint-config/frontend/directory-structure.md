# Directory Structure

> How `@zanelab/commitlint-config` is organized.

---

## Package Layout

```
tooling/commitlint-config/
├── index.mjs          # Commitlint config (the single source file)
└── package.json       # Package metadata and dependencies
```

The package is consumed at the root level via:

```
commitlint.config.ts  # Extends @zanelab/commitlint-config
```

---

## `index.mjs` — Config Structure

The config is a default-exported object conforming to `cz-git`'s `UserConfig` type. Key sections:

### `extends`

```js
extends: ['@commitlint/config-conventional'],
```

Extends the standard Conventional Commits ruleset as a baseline.

### `plugins`

```js
plugins: ['commitlint-plugin-function-rules'],
```

Uses `commitlint-plugin-function-rules` for custom scope validation that dynamically resolves monorepo package names.

### `rules`

Defines the enforced commit rules (see [Quality Guidelines](./quality-guidelines.md) for details):

- `type-enum` — allowed commit types
- `function-rules/scope-enum` — dynamic scope validation
- `header-max-length` — 108 chars
- `body-leading-blank` / `footer-leading-blank` — spacing
- `subject-empty`, `type-empty` — required fields

### `prompt`

cz-git interactive prompt configuration:

- **aliases** — shortcuts like `f` → `docs: fix typos`, `s` → `style: update code format`
- **typesAppend** — adds `workflow` and `types` commit types to the cz-git prompt
- **scope detection** — auto-detects scope from `git status` by parsing modified files under `src/` directories

---

## Dependencies

| Dependency | Purpose |
|---|---|
| `@commitlint/cli` | Lint commit messages |
| `@commitlint/config-conventional` | Base Conventional Commits rules |
| `@zanelab/node-utils` | Monorepo package discovery via `getPackagesSync()` |
| `commitlint-plugin-function-rules` | Custom scope validation function |
| `cz-git`, `czg` | Interactive commit prompt |

---

## Auto-Scope Detection

The config auto-detects the commit scope by inspecting `git status`:

```js
const scopeComplete = execSync('git status --porcelain || true')
  .toString()
  .trim()
  .split('\n')
  .find((r) => ~r.indexOf('M  src'))
  ?.replaceAll(/(\/)/g, '%%')
  ?.match(/src%%((\w|-)*)/)?.[1]
  ?.replace(/s$/, '');
```

This finds modified files under a `src/` directory and extracts the directory name (with trailing 's' stripped for pluralization) as the default scope in the cz-git prompt.

---

## Naming Conventions

- Config packages are named `@zanelab/<tool>-config`
- The entry point is always `index.mjs`
- Config is a default export for direct consumption
# Quality Guidelines

> Commit quality rules enforced by `@zanelab/commitlint-config`.

---

## Enforced Rules

### type-enum

**Level: error (2)**

```js
'type-enum': [2, 'always', [
  'feat', 'fix', 'perf', 'style', 'docs', 'test',
  'refactor', 'build', 'ci', 'chore', 'revert',
  'types', 'release',
]],
```

Only these types are allowed. Note: `workflow` is also valid — it's appended via `typesAppend` in the cz-git prompt config and adds to the allowed set.

### Scope Validation

**Level: error (2)**

The built-in `scope-enum` rule is disabled (`[0]`) in favor of a custom function rule via `commitlint-plugin-function-rules`:

```js
'function-rules/scope-enum': [2, 'always', (parsed) => {
  if (!parsed.scope || allowedScopes.includes(parsed.scope)) {
    return [true];
  }
  return [false, `scope must be one of ${allowedScopes.join(', ')}`];
}],
```

**Allowed scopes** are dynamically computed:

1. All monorepo package names (from `@zanelab/node-utils` `getPackagesSync()`)
2. Fixed scopes: `project`, `task`, `style`, `lint`, `ci`, `dev`, `deploy`, `other`

An empty scope is also valid (no scope needed for some commits).

### header-max-length

**Level: error (2)**

```js
'header-max-length': [2, 'always', 108],
```

Commit headers must not exceed 108 characters. This ensures readability in GitHub, `git log --oneline`, and other tools.

### Formatting Rules

| Rule | Level | Requirement |
|------|-------|-------------|
| `body-leading-blank` | error (2) | Blank line required before body |
| `footer-leading-blank` | warning (1) | Blank line required before footer |
| `subject-empty` | error (2) | Subject must not be empty |
| `type-empty` | error (2) | Type must not be empty |
| `subject-case` | off (0) | No case restriction on subject |
| `scope-enum` | off (0) | Disabled; uses function-rules instead |

---

## Interactive Commit (cz-git)

Commits can be created interactively using:

```bash
pnpm commit
```

### Aliases

| Alias | Expands to |
|-------|-----------|
| `b` | `build: bump dependencies` |
| `c` | `chore: update config` |
| `f` | `docs: fix typos` |
| `r` | `docs: update README` |
| `s` | `style: update code format` |

### Appended Types

The cz-git prompt also offers `workflow` and `types` as additional commit types beyond the standard Conventional Commits set.

---

## Forbidden Patterns

- **Do not use types outside the allowed enum** — the commit will be rejected
- **Do not use a scope that is not a monorepo package or fixed scope** — validated by function-rules
- **Do not omit the type** — `type-empty` is an error
- **Do not omit the subject** — `subject-empty` is an error
- **Do not put content directly after the header without a blank line** — `body-leading-blank` is enforced

---

## Commit Message Examples

**Correct:**

```
feat(@zanelab/api): add patient search endpoint
```

```
fix(project): resolve navigation state loss on refresh

The browser back button was not restoring the correct page state
due to stale history entries.
```

```
chore(task): archive AI-BRAINSTORM-0423
```

**Incorrect:**

```
// Header too long (over 108 chars)
feat(@zanelab/api): add comprehensive patient search endpoint with filtering, sorting, and pagination support
```

```
// No blank line before body
docs: update README
Added new sections and fixed typos.
```

```
// Invalid type
update: refresh dependencies
```
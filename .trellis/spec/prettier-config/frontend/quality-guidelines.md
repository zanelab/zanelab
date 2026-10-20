# Quality Guidelines

> Formatting standards enforced by `@zanelab/prettier-config`.

---

## Enforced Formatting Rules

### printWidth: 80

Lines exceeding 80 characters are wrapped. This keeps code readable on narrower screens and side-by-side diffs.

### semi: true

All statements end with semicolons. No ASI ambiguity.

### singleQuote: true

Single quotes are used for strings in JavaScript/TypeScript:

```js
// Correct
const name = 'hello';

// Incorrect (auto-fixed)
const name = "hello";
```

JSX attributes still use double quotes (this is a Prettier default for JSX and is maintained).

### trailingComma: 'all'

Trailing commas are added wherever possible (function parameters, arrays, objects, etc.). This produces cleaner diffs when adding or removing items.

```js
// Correct
const config = {
  a: 1,
  b: 2,  // trailing comma
};

function foo(
  x,
  y,  // trailing comma
) {}
```

### endOfLine: 'auto'

Line endings are preserved as-is (LF or CRLF) based on the file's existing convention. No forced normalization.

### proseWrap: 'never'

Prose in Markdown files is not wrapped. This prevents unwanted line breaks in documentation when applying formatting:

```markdown
<!-- Both stay as-is -->
This is a long paragraph that will not be wrapped by Prettier even if it exceeds 80 characters.
```

---

## Tailwind CSS Class Sorting

`prettier-plugin-tailwindcss` automatically sorts utility classes following Tailwind's recommended order:

```html
<!-- Before -->
<div class="flex p-4 bg-red-500 text-white font-bold rounded">

<!-- After sorting -->
<div class="flex rounded bg-red-500 p-4 font-bold text-white">
```

The ordering follows Tailwind's layer system: base → components → utilities, with utilities grouped by category (layout → spacing → typography → colors → etc.).

---

## JSON5 Override

JSON5 files (`.json5`) use special formatting rules:

- `quoteProps: 'preserve'` — property keys keep their original quoting style (quoted or unquoted)
- `singleQuote: false` — strings use double quotes

This preserves compatibility with tools that consume JSON5 but expect JSON-like formatting.

---

## Forbidden Patterns

These are not "forbidden" in the traditional sense since Prettier auto-formats, but should be avoided:

- **Do not manually format code that conflicts with Prettier** — it will be reverted on the next format
- **Do not disable Prettier for entire files** (e.g., `<!-- prettier-ignore -->` at file level) except in rare, justified cases
- **Do not add custom Prettier overrides in individual packages** — all formatting must go through the shared config
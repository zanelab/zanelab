# Quality Guidelines

> CSS/SCSS linting rules enforced by `@zanelab/stylelint-config`.

---

## CSS Property Ordering

The `order/order` rule enforces a consistent declaration order within each CSS rule block:

```js
'order/order': [[
  'dollar-variables',           // SCSS variables first
  'custom-properties',          // CSS custom properties
  'at-rules',                   // Generic at-rules
  { name: 'supports', type: 'at-rule' },
  { name: 'media', type: 'at-rule' },
  { name: 'include', type: 'at-rule' },  // SCSS mixins
  'declarations',               // Regular property declarations
  'rules',                      // Nested rules last
], { severity: 'error' }],
```

**Order (top to bottom):**

1. `$dollar-variables` — SCSS variables
2. `custom-properties` — CSS `--custom-props`
3. Generic `@`-rules
4. `@supports` blocks
5. `@media` queries
6. `@include` mixins (SCSS)
7. Regular declarations (`color`, `display`, etc.)
8. Nested rules (`&__element`, `&--modifier`)

Property-level ordering within the declarations group is handled by `stylelint-config-recess-order`.

---

## BEM Selector Class Pattern

A BEM-style class naming convention is enforced via `selector-class-pattern`:

```
^(?:(?:o|c|u|t|s|is|has|_|js|qa)-)?[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*(?:__[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*)?(?:--[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*)?(?:[.+])?$
```

**Allowed patterns:**

- `block` — plain lowercase/hyphenated block name
- `block__element` — double underscore for elements
- `block--modifier` — double dash for modifiers
- Optional namespace prefixes: `o-`, `c-`, `u-`, `t-`, `s-`, `is-`, `has-`, `_`, `js-`, `qa-`
- Trailing `.` or `+` allowed (for state hooks)

**Examples:**

```css
/* Correct */
.c-button {}
.c-button__icon {}
.c-button--primary {}
.is-active {}
.js-toggle {}

/* Correct — namespaces + BEM */
.o-layout {}
.u-margin-top {}
```

---

## At-Rule Allowances

### Standard at-rule-no-unknown

Overridden to allow Tailwind and Sass at-rules:

```js
'at-rule-no-unknown': [true, {
  ignoreAtRules: [
    'extends', 'ignores', 'include', 'mixin', 'if', 'else',
    'media', 'for', 'at-root', 'tailwind', 'apply', 'variants',
    'responsive', 'screen', 'function', 'each', 'use', 'forward', 'return',
  ],
}],
```

### SCSS at-rule-no-unknown

Same allowances replicated for the SCSS-specific rule:

```js
'scss/at-rule-no-unknown': [true, {
  ignoreAtRules: [/* same list as above */],
}],
```

---

## Prettier Integration

The `stylelint-prettier` plugin runs Prettier as a Stylelint rule:

```js
'prettier/prettier': true,
```

This means running `stylelint --fix` will also apply Prettier formatting to CSS/SCSS files.

---

## Nullified Rules (Disabled)

These standard rules are turned off because they conflict with project patterns:

| Rule | Reason |
|------|--------|
| `at-rule-no-deprecated` | Allows legacy at-rule syntax |
| `font-family-no-missing-generic-family-keyword` | Assumes font stacks include a fallback |
| `function-no-unknown` | Allows custom SCSS/Tailwind functions |
| `import-notation` | Allows string-based `@import` in SCSS |
| `media-feature-range-notation` | Allows legacy media query syntax |
| `named-grid-areas-no-invalid` | Doesn't parse all grid patterns correctly |
| `no-descending-specificity` | Too strict for BEM/component patterns |
| `no-empty-source` | Allows empty style files |
| `scss/operator-no-newline-after` | Allows operators at end of line |
| `selector-not-notation` | Allows legacy `:not()` syntax |

---

## File Ignoring

Stylelint ignores these file types entirely:

```js
ignoreFiles: ['**/*.js', '**/*.jsx', '**/*.tsx', '**/*.ts', '**/*.json', '**/*.md'],
```

CSS-in-JS is **not** linted through Stylelint. Use ESLint for CSS-in-JS patterns.

---

## Vue SFC Specifics

For `.vue` files, the `postcss-html` parser is used with these additional allowances:

```js
'selector-pseudo-class-no-unknown': [true, {
  ignorePseudoClasses: ['global', 'deep'],
}],
'selector-pseudo-element-no-unknown': [true, {
  ignorePseudoElements: ['v-deep', 'v-global', 'v-slotted'],
}],
```

This enables Vue's scoped style penetration syntax (`::v-deep`, `:deep()`, `:global()`, `:slotted()`).

---

## Forbidden Patterns

- **Do not write style declarations out of order** — the `order/order` rule enforces the sequence; `stylelint --fix` will reorder them
- **Do not skip the BEM class naming pattern** — arbitrary class names will fail the `selector-class-pattern` rule
- **Do not use unknown at-rules without adding them to the allowlist** — new Sass/Tailwind directives need explicit approval
- **Do not nest too deeply** — although no explicit depth limit is set, BEM patterns should keep nesting shallow (1-2 levels)
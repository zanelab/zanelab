# Backend Development Guidelines

> Utility conventions for `@zanelab/utils` — non-React, platform-agnostic code.

---

## Overview

`@zanelab/utils` is a **utility library** with both platform-agnostic utilities (pub/sub, caching, color math, password validation) and React-specific utilities (`syncNavigate`, menu search). The "backend" layer covers the non-React utilities — functions that work without React or the DOM.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Module organization and file layout | Filled |
| [Utility Guidelines](./utility-guidelines.md) | Patterns for utility functions and singletons | Filled |
| [Error Handling](./error-handling.md) | Error notification via pub/sub | Filled |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, forbidden patterns | Filled |

---

## Package Identity

- **Name:** `@zanelab/utils`
- **Location:** `packages/utils/`
- **Module type:** ESM (`"type": "module"`)
- **Exports:** `".": "./src/index.ts"` — single barrel export
- **Dependencies:** `@ctrl/tinycolor`, `theme-colors`, `nprogress`, `@zanelab/types`
- **Peer dependencies:** `react-dom: ^19`
- **Testing:** Vitest

---

## Utility Catalog

| Module | Type | Exports |
|--------|------|---------|
| `notify.ts` | Pub/sub singleton | `notify`, `NotifyMessage`, `NotifyLevel` |
| `cache.ts` | localStorage wrapper | `cache` (get/set/remove with TTL) |
| `color.ts` | Color utilities | `convertToHsl`, `isValidColor`, `generatorColorVariables`, `ColorItem` |
| `locale.ts` | Locale normalization | `SUPPORTED_LOCALES`, `normalizeLocale`, `toLegacyLocale` |
| `diff.ts` | Deep object diff | `diff`, `arraysEqual` |
| `password.ts` | Password validation | `validatePasswordPolicy`, `matchPasswordCharClasses` |
| `password-policy.ts` | Password policy config | `PASSWORD_POLICY`, `PasswordCharClass` |
| `nprogress.ts` | Progress bar wrappers | `startProgress`, `stopProgress` |

---

**Language:** All documentation should be written in **English**.
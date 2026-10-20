# Directory Structure

> How React-specific utilities are organized in `@zanelab/utils`.

---

## Overview

React-specific utilities live alongside platform-agnostic utilities in the same flat `src/` directory. The distinction is by dependency: files that import from `react-dom` or `@zanelab/types` are frontend utilities; files without React dependencies are backend.

---

## Directory Layout

```
packages/utils/src/
├── cache.ts              # Backend: localStorage wrapper
├── color.ts              # Backend: color utilities
├── diff.ts               # Backend: deep object diff
├── locale.ts             # Backend: locale normalization
├── notify.ts             # Backend: pub/sub singleton
├── nprogress.ts          # Backend: progress bar wrapper
├── password.ts           # Backend: password validation
├── password-policy.ts    # Backend: password policy config
├── find-menu-by-path.ts  # Frontend: recursive menu search (imports @zanelab/types)
└── sync-navigate.ts      # Frontend: flushSync navigation (imports react-dom)
```

---

## Identifying Frontend vs Backend Utilities

| Criterion | Backend | Frontend |
|-----------|---------|----------|
| Imports `react` or `react-dom` | No | Yes |
| Imports React types (`@zanelab/types` menu, layout) | No | Yes |
| Uses `localStorage`, `document`, `window` | Yes | No |
| Pure computation (color, diff, locale) | Yes | No |

---

**Language:** All documentation should be written in **English**.
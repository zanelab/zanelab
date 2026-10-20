# Error Handling

> Error notification patterns in `@zanelab/utils`.

---

## Overview

`@zanelab/utils` does not use traditional try/catch error propagation. Instead, errors are communicated through the **`notify` pub/sub singleton**. Utility functions return `null`/`undefined` for invalid inputs rather than throwing exceptions.

---

## Error Notification Pattern

The `notify` module provides typed error messaging:

```ts
import { notify } from '@zanelab/utils';

// Notify an error (consumed by ToastRegion in @zanelab/ui)
notify.error('Failed to save configuration');

// Notify a warning
notify.warning('Session expires in 5 minutes');

// Notify success
notify.success('Changes saved');

// Notify info
notify.info('New update available');
```

---

## Notify Architecture

The `notify` singleton:
- Maintains a `Set` of listeners
- Buffers messages when no listeners are subscribed (up to `PENDING_LIMIT = 5`)
- Delivers backlog to new subscribers immediately
- Returns an unsubscribe function from `subscribe()`

Components like `ToastRegion` in `@zanelab/ui` subscribe and render DaisyUI toasts.

---

## Return-style Error Handling

Utility functions that validate input return `null`/`undefined`:

```ts
// cache.get returns null on missing or corrupt data
const data = cache.get<Config>('app-config');
if (!data) {
  notify.error('Could not load saved configuration');
  return;
}

// normalizeLocale returns undefined for unrecognized input
const locale = normalizeLocale(rawInput);
if (!locale) {
  notify.warning(`Unsupported locale: ${rawInput}`);
}

// validatePasswordPolicy returns null (valid) or an issue string
const issue = validatePasswordPolicy(password);
if (issue === 'length') {
  notify.error('Password must be 8-32 characters');
}
if (issue === 'charClasses') {
  notify.error('Password must include at least 3 character types');
}
```

---

## Forbidden Patterns

- **Throwing exceptions** in utilities — use notify + return null instead
- **Silent failures** — always communicate errors via notify or return value
- **`console.error`** in production utilities — use `notify.error()`
- **Raw try/catch without user feedback** — if you catch, tell the user

---

**Language:** All documentation should be written in **English**.
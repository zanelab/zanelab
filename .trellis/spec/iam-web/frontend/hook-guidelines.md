# Hook Guidelines

> How hooks are used in `@zanelab/iam-web`.

---

## Overview

This project uses only built-in React hooks and React Router hooks. There are **no custom hooks** defined. The app is small enough that custom hook extraction would be premature.

Hooks currently in use across `src/App.tsx`:

| Hook | Source | Usage |
|------|--------|-------|
| `useState` | `react` | Local component state (chat messages, input) |
| `useLocation` | `react-router-dom` | Read current route pathname for display |

---

## Custom Hook Patterns

No custom hooks exist yet. When the codebase grows, extract reusable logic following React conventions:

- **Name must start with `use`** (e.g., `useHostProps`, `useChat`)
- Place in a `src/hooks/` directory (create only when needed)
- Export as named functions (never default exports)

Example of what a future `useHostProps` hook might look like:

```tsx
// Hypothetical future pattern — does not exist yet
import { getProps, type PltProps } from '../main';

export function useHostProps(): PltProps {
  return getProps();
}
```

Currently, components call `getProps()` directly inside the component body — this is the established pattern.

---

## Data Fetching

There is **no data fetching** in this app. The `ChatPage` simulates a bot response with `setTimeout`:

```tsx
// src/App.tsx — simulated async response, not real data fetching
setTimeout(
  () => setMessages((m) => [...m, { role: 'bot', text: `收到：${text}` }]),
  200,
);
```

No React Query, SWR, fetch, axios, or any HTTP client is configured. If data fetching is added later, use a library like `@tanstack/react-query` and follow the project's established patterns for error handling.

---

## Naming Conventions

- Built-in hooks use their standard camelCase names: `useState`, `useLocation`
- `useState` with functional updaters when deriving from previous state:

```tsx
// Correct — functional updater for derived state
setMessages((m) => [...m, { role: 'user', text }]);

// Also correct — simple setter for independent state
setInput('');
```

---

## Common Mistakes

1. **Creating custom hooks for one-off logic** — the current inline pattern is fine. Extract only when the same logic appears in 3+ places.
2. **Using `useState` without functional updaters when deriving from previous state** — always use `setState(prev => ...)` when the new value depends on the previous value, as done in `ChatPage.send()`.
3. **Importing hooks you don't need** — `useState` and `useLocation` are the only hooks currently imported. Don't import `useEffect`, `useMemo`, `useCallback` etc. until there's a concrete need.
4. **Putting data fetching in components directly** — once real APIs are integrated, move fetch logic to hooks or a data-fetching library.
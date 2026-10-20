# State Management

> How state is managed in `@zanelab/iam-web`.

---

## Overview

This project uses **React local state only**. There is no global state management library (no Zustand, Redux, Jotai, or Context). This is appropriate for the current scale — state is isolated to individual components and host-injected data is accessed imperatively.

---

## State Categories

### Local Component State (`useState`)

Used in `ChatPage` for ephemeral UI state:

```tsx
// src/App.tsx
function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    // ...
  };
}
```

State is fully contained within the component — no lifting, no context, no external stores.

### Host-Provided State (`getProps()`)

Data from the Qiangun host (token, basename, permissions) is accessed via `getProps()`:

```tsx
// src/main.tsx
let savedProps: PltProps = {};

export function getProps(): PltProps {
  return savedProps;
}

// Called during Qiangun mount
renderWithQiankun({
  mount(props) {
    savedProps = props as PltProps;
    render(savedProps);
  },
});
```

Components call `getProps()` directly to read host data:

```tsx
// src/App.tsx
function SystemPage({ title }: { title: string }) {
  const props = getProps();
  // props.token, props.permissions available here
}
```

This is a **module-level singleton** pattern — `savedProps` is a mutable variable at the module scope, not React state. It does not trigger re-renders when updated, but since the Qiangun mount/unmount cycle re-renders the entire app tree, this is not a problem in practice.

### Standalone Mode

When running outside Qiangun (development mode), the app initializes with hardcoded defaults:

```tsx
// src/main.tsx
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  render({ basename: '/' });
}
```

In standalone mode:
- `basename` defaults to `'/'`
- `container` defaults to `document.getElementById('root')!`
- `token` and `permissions` are absent from `savedProps`

---

## When to Use Global State

The threshold for introducing global state is:

1. **Data needed by 3+ unrelated components** — if multiple components need the same host data beyond what `getProps()` provides, consider a Context or Zustand store.
2. **Cross-route persistence** — React Router remounts components on navigation, so `useState` resets. If you need state to survive navigation between `/users` and `/roles`, introduce a store.
3. **Complex state with multiple consumers and writers** — the chat state in `ChatPage` is self-contained; if other pages need to access chat history, lift it up.

---

## Server State

There is **no server state** in this app. No API calls, no caching, no synchronization with a backend. The chat bot response is simulated locally with `setTimeout`. When real APIs are added, follow the hook guidelines for data fetching.

---

## Common Mistakes

1. **Reaching for Zustand/Redux immediately** — this app has 2 components and no cross-component shared state. Local state and `getProps()` are sufficient.
2. **Treating `getProps()` as reactive** — it returns a snapshot of the saved props object. It does not trigger re-renders. Do not use it inside `useEffect` dependencies expecting reactivity.
3. **Modifying `savedProps` directly** — only the Qiangun lifecycle hooks (`mount`) should write to `savedProps`. Components should read via `getProps()` only.
4. **Putting route state in global store** — `useLocation()` from React Router gives you the current pathname. Don't duplicate route information into a separate store.
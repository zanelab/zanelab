# Component Guidelines

> How components are built in `@zanelab/iam-web`.

---

## Overview

All components in this project are defined **inline in `src/App.tsx`** as module-scoped function declarations. There are no separate component files, no `components/` directory, and no default exports. This is a deliberate choice for a small micro-frontend — when the codebase grows, components should be extracted into individual files, but for the current scale the single-file structure keeps everything visible.

---

## Component Structure

Every component is a **function declaration** (not arrow function) exported from `src/App.tsx`:

```tsx
// src/App.tsx
function SystemPage({ title }: { title: string }) {
  const props = getProps();
  const location = useLocation();
  return (
    <div className="p-6">
      <div className="card bg-base-100 w-[28rem] shadow-xl">
        <div className="card-body gap-3">
          <h2 className="card-title">
            {title}{' '}
            <span className="badge badge-secondary badge-outline">
              来自 iam
            </span>
          </h2>
          <div className="text-sm opacity-70">
            当前路由：{location.pathname}
          </div>
          <div className="text-xs opacity-50">
            token: {props.token ? '已注入' : '未注入'} · permissions:{' '}
            {Array.isArray(props.permissions) ? props.permissions.length : 0} 项
          </div>
        </div>
      </div>
    </div>
  );
}
```

Key patterns:

- **Inline props types** using object type literals directly in the parameter: `{ title: string }`
- Host data accessed via `getProps()` from `src/main.tsx` (not via prop drilling)
- Route state read via `useLocation()` from React Router

---

## Props Conventions

Props are typed inline in function parameters — no separate interface/type declarations for component props:

```tsx
// Props typed inline — the standard pattern
function SystemPage({ title }: { title: string }) { ... }

// Local interfaces only used for data shapes, not component props
interface Msg {
  role: 'user' | 'bot';
  text: string;
}
```

The `PltProps` interface in `src/main.tsx` is the only externally-facing props type. It describes properties injected by the Qiangun host:

```tsx
// src/main.tsx
export interface PltProps {
  container?: HTMLElement;
  setHasRender?: (v: boolean) => void;
  getHostState?: () => Record<string, unknown>;
  onHostStateChange?: (
    cb: (state: Record<string, unknown>, prev: Record<string, unknown>) => void,
    fireImmediately?: boolean,
  ) => () => void;
  [key: string]: unknown;
}
```

The index signature `[key: string]: unknown` allows arbitrary host-injected fields like `basename`, `token`, and `permissions` to flow through without explicit typing. Access these with type assertions (`props.basename as string | undefined`) or guards (`Array.isArray(props.permissions)`).

---

## Styling Patterns

This project uses **DaisyUI** (Tailwind CSS component classes). The CSS is imported via DaisyUI's CDN or build setup — there are no local CSS files.

DaisyUI classes observed in the codebase:

| Class Pattern | Usage |
|---------------|-------|
| `card bg-base-100 shadow-xl` | Card containers for `SystemPage` |
| `card-body gap-3` | Card body with spacing |
| `card-title` | Card heading |
| `badge badge-secondary badge-outline` | Badge showing "来自 iam" micro-frontend indicator |
| `rounded-box bg-base-100 shadow-xl` | Container for `ChatPage` |
| `chat chat-end` / `chat chat-start` | Chat message alignment |
| `chat-bubble` | Chat message bubble style |
| `input input-bordered input-sm` | Text input field |
| `btn btn-sm btn-primary` | Action button |
| `text-sm opacity-70` | Subdued status text |
| `text-xs opacity-50` | Micro-status text |
| `p-6` | Page-level padding |
| `space-y-2` | Vertical spacing between messages |

Responsive widths use arbitrary Tailwind values: `w-[28rem]` and `w-[40rem]`.

---

## Accessibility

Basic implicit accessibility through DaisyUI semantic classes:
- Form elements use `<input>` with placeholder text
- Buttons use `<button>` with descriptive text
- Headings use `<h2>`

No explicit ARIA attributes, roles, or focus management are implemented. This is acceptable for an internal admin tool but should be enhanced if the app faces external users.

---

## Common Mistakes

1. **Creating a `components/` directory prematurely** — the current 2-file layout works. Only extract when you have 5+ components or cross-cutting concerns.
2. **Prop drilling host data** — use `getProps()` in the component body instead. Props from the host (basename, token, permissions) are available globally via `getProps()`.
3. **Using arrow functions for components** — the codebase convention is `function` declarations. Arrow functions are fine for inline handlers and callbacks but not top-level components.
4. **Adding CSS files** — use DaisyUI/Tailwind classes. No `.css` or `.module.css` files exist in the project.
5. **Forgetting the index signature access pattern** — host props like `token` and `permissions` are accessed via the `[key: string]: unknown` index signature. Always guard with type checks: `Array.isArray(props.permissions)`.
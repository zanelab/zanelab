# Component Guidelines

> How to build React components in `@zanelab/ui`.

---

## Overview

All components are **function components** with **named exports** and **typed props interfaces**. Styling uses **DaisyUI + Tailwind v4** classes exclusively.

---

## Component Structure

### Basic Pattern

Every component follows this structure:

```tsx
import type { ReactNode } from 'react';

interface ComponentNameProps {
  // typed props
}

export function ComponentName({ prop1, prop2 }: ComponentNameProps) {
  // component body
  return <div className="daisyui-class tailwind-class">...</div>;
}
```

**Rules:**
- Props interface: `ComponentNameProps`, defined in the same file
- Export: `export function ComponentName` — named function export
- Props destructured in parameter
- Default values in destructuring: `offsetY = 0`
- No default exports

### Real Example: Block

**From `packages/ui/src/form/block.tsx`:**

```tsx
import type { ReactNode } from 'react';

interface BlockProps {
  title?: string;
  children: ReactNode;
}

export function Block({ title, children }: BlockProps) {
  return (
    <div className="flex flex-col py-4">
      {title && (
        <h3 className="mb-3 leading-none font-semibold tracking-tight">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
```

### Real Example: ToggleItem

**From `packages/ui/src/form/toggle-item.tsx`:**

```tsx
import type { ReactNode } from 'react';

interface SelectOption {
  label: string;
  value: string;
}

interface ToggleItemProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  items?: SelectOption[];
  children: ReactNode;
}

export function ToggleItem({
  value,
  onChange,
  disabled = false,
  items = [],
  children,
}: ToggleItemProps) {
  return (
    <div className={`... ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
      <span className="text-sm">{children}</span>
      <div className="flex gap-2">
        {items.map((item) => (
          <button
            key={item.value}
            className={`h-7 min-h-0 rounded-sm px-3 text-xs font-normal ${
              value === item.value
                ? 'bg-primary text-primary-content'
                : 'btn btn-outline btn-sm'
            }`}
            disabled={disabled}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## Props Conventions

- **Interface name:** `ComponentNameProps` (e.g., `LogoProps`, `BlockProps`)
- **Optional props:** marked with `?` or default values in destructuring
- **Children:** typed as `ReactNode` from `react`
- **Callbacks:** typed inline — `onChange: (value: string) => void`
- **Callback options objects:** typed inline — `onScrollAt?: (state: { bottom: boolean; left: boolean; right: boolean; top: boolean }) => void`
- **Style props:** `className?: string`, `style?: CSSProperties`

---

## Styling Patterns

### DaisyUI Classes

All visual styling uses DaisyUI semantic classes:

| Context | Classes |
|---------|---------|
| Alerts/toasts | `alert`, `alert-success`, `alert-error`, `alert-warning`, `alert-info` |
| Buttons | `btn`, `btn-outline`, `btn-sm` |
| Containers | `toast`, `toast-top`, `toast-center` |
| Backgrounds | `bg-primary`, `bg-base-200`, `text-primary-content` |
| Border | `border-border`, `border-t`, `border-b` |
| Layout | `hover:bg-base-200` |
| Forms | Component-level classes, no DaisyUI form classes directly |

### Tailwind Utilities

- Spacing: `flex`, `gap-2`, `py-4`, `px-3`, `mb-3`, `h-7`, `h-12`
- Typography: `text-sm`, `text-xs`, `text-lg`, `font-semibold`, `font-normal`, `tracking-tight`
- Layout: `pointer-events-none`, `sticky`, `z-10`, `z-1000`
- Effects: `rounded-sm`, `rounded-md`, `rounded-none`
- Transitions: `transition-all`, `transition-opacity`, `duration-300`, `duration-500`, `ease-in-out`
- Performance: `will-change-[opacity]`

### Dynamic Classes

Conditional styling uses template literals with ternaries:

```tsx
className={`base-class ${
  condition ? 'active-class' : 'inactive-class'
}`}
```

Or with array filters:

```tsx
const computedShadowClasses = horizontal
  ? [
      !isAtLeft && !isAtRight && showLeft && showRight ? 'both-shadow' : '',
      !isAtLeft && showLeft ? 'left-shadow' : '',
      !isAtRight && showRight ? 'right-shadow' : '',
    ].filter(Boolean).join(' ')
  : '';
```

---

## Portal Pattern

`AnchoredPortal` uses `createPortal` to render into `document.body`:

**From `packages/ui/src/anchored-portal.tsx`:**

```tsx
import { createPortal } from 'react-dom';

export function AnchoredPortal({ open, ... }: AnchoredPortalProps) {
  if (!open || !coords) return null;

  return createPortal(
    <div ref={panelRef} style={{ position: 'fixed', top: coords.top, right: coords.right, zIndex: 1000 }}>
      {children}
    </div>,
    document.body,
  );
}
```

---

## Pub/Sub Integration

`ToastRegion` consumes the `notify` singleton from `@zanelab/utils`:

```tsx
import { notify, type NotifyMessage } from '@zanelab/utils';

export function ToastRegion() {
  const [items, setItems] = useState<NotifyMessage[]>([]);

  useEffect(() => {
    const unsubscribe = notify.subscribe((msg) => {
      setItems((prev) => [...prev, msg]);
      setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== msg.id));
      }, AUTO_DISMISS_MS);
    });
    return () => unsubscribe();
  }, []);

  // render DaisyUI toast elements
}
```

---

## Accessibility

- `ToastRegion`: uses `aria-live="polite"` and `role="alert"`
- `ToggleItem`: `disabled` prop applied to buttons
- Image alt text: `alt={text}` on `Logo`

---

## Common Mistakes

- Using `export default` — always use named exports
- Importing React (not needed in React 19 with automatic JSX transform) — only import hooks and types from `react`
- Forgetting `type` on type-only imports — `import type { ReactNode } from 'react'`
- Inline styles instead of DaisyUI classes — prefer class-based styling

---

**Language:** All documentation should be written in **English**.
import { cloneElement, type ReactElement } from 'react';
import { useMenuStore } from '../stores/menu-store';

interface PermissionProps {
  code: string;
  mode?: 'hide' | 'disabled';
  children: ReactElement;
}

export function Permission({ code, mode = 'hide', children }: PermissionProps) {
  const permissions = useMenuStore((state) => state.permissions);

  if (permissions.includes(code)) return children;

  if (mode === 'disabled') {
    return cloneElement(children, {
      ...(children.props as Record<string, unknown>),
      disabled: true,
      'aria-disabled': true,
      className: `${(children.props as { className?: string }).className ?? ''} disabled`,
    } as never);
  }
  return null;
}

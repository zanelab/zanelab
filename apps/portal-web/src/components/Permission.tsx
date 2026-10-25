import { cloneElement, type ReactElement } from 'react';
import { useMenuStore } from '../stores/menu-store';

// 按钮级权限组件（§7.4）：hide/disabled 两模式。
// 前端权限只是体验优化，真正的鉴权在后端（spec core invariant）。

interface PermissionProps {
  /** 权限码，如 'system:user:add' */
  code: string;
  mode?: 'hide' | 'disabled';
  children: ReactElement;
}

export function Permission({ code, mode = 'hide', children }: PermissionProps) {
  const permissions = useMenuStore((state) => state.permissions);

  if (permissions.includes(code)) return children;

  if (mode === 'disabled') {
    // daisyUI 禁用语义：disabled 属性 + 类（btn/input 等原生交互元素生效）
    return cloneElement(children, {
      ...(children.props as Record<string, unknown>),
      disabled: true,
      'aria-disabled': true,
      className: `${(children.props as { className?: string }).className ?? ''} disabled`,
    } as never);
  }
  return null;
}

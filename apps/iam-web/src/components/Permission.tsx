import type { ReactNode } from 'react';
import { getProps } from '../props';

/*
 * Permission 权限组件（任务 11-06 RBAC，design DD6）。
 *
 * 前端按权限码控制显隐/禁用 —— 「前端只隐藏、后端强制」的前端半边：
 * - 数据源 getProps().permissions（宿主 register.ts 的 flattenPermissions 提取，
 *   mount 时注入的权限码数组；admin 持 '*'）。
 * - mode="hide"：无权限不渲染 children（默认）。
 * - mode="disabled"：无权限渲染但整体禁用（pointer-events + 弱化 + aria-disabled）。
 * - 独立态（宿主未注入 permissions = undefined）：一律渲染——独立 dev 无宿主权限
 *   注入，写操作靠接口 403 兜底（集成态才是「按钮不显示」的主战场）。
 */

export interface PermissionProps {
  /** 权限码（system:menu:create 等，与 Edge Fn requirePermission 同源）。 */
  code: string;
  mode?: 'hide' | 'disabled';
  children: ReactNode;
}

export function Permission({ code, mode = 'hide', children }: PermissionProps) {
  const permissions = getProps().permissions;

  // 独立态：未注入 permissions → 不隐藏（后端 403 兜底）
  if (!permissions) return <>{children}</>;

  const allowed = permissions.includes('*') || permissions.includes(code);
  if (allowed) return <>{children}</>;

  if (mode === 'disabled') {
    return (
      <span
        aria-disabled="true"
        className="pointer-events-none opacity-40 select-none"
      >
        {children}
      </span>
    );
  }

  return null;
}

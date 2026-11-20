import type { ReactNode } from 'react';
import { getProps } from '../props';

/*
 * Permission 权限组件（与 iam-web src/components/Permission.tsx 同构；跨应用
 * 不互引，按各自数据源取码——skills-web 经本应用 props.ts 的 getProps() 读宿主
 * 注入的权限码，不读宿主的 menu store）。
 *
 * 前端按权限码控制显隐/禁用 —— 「前端只隐藏、后端强制」的前端半边：
 * - 数据源 getProps().permissions（宿主 register.ts 的 flattenPermissions 提取，
 *   getter 语义：每次 render 读最新值，无模块级快照/订阅）。
 * - mode="hide"：无权限不渲染 children（默认）。
 * - mode="disabled"：无权限渲染但整体禁用（span 包裹：pointer-events + 弱化 +
 *   aria-disabled，iam-web 同款——不 cloneElement，无 Fragment 子元素限制）。
 * - 独立态（宿主未注入 permissions = undefined）：一律渲染——独立 dev 无宿主权限
 *   注入，写操作靠接口 403 兜底（集成态才是「按钮不显示」的主战场）。
 *   注意**空数组不是独立态**：有宿主但无权限 → 不放行（按钮隐藏）。
 */

export interface PermissionProps {
  /** 权限码（模块:资源:操作，如 skills:skill:create，与后端 requirePermission 同源）。 */
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

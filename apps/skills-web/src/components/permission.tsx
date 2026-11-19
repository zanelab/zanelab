import { cloneElement, type ReactElement, type ReactNode } from 'react';
import { hasPermission } from '../utils/permission';
import { usePermissions } from '../hooks/use-permissions';

/**
 * 按钮级权限（语义对齐 portal / iam-web 的同名组件，component-guidelines.md:48-68）：
 * 跨应用不互引，按各自数据源取码——skills-web 取本应用权限内核（permission.ts，
 * 由宿主 props.permissions / onHostStateChange 喂入），不读宿主的 menu store。
 *
 * 判定规则与放行条件见 permission.ts 的 hasPermission：
 * 无宿主（独立态）一律渲染，有宿主时需命中权限码或含通配 `*`。
 *
 * **disabled 模式对子元素形状有要求**：cloneElement 只把 disabled 安放到单个可接
 * disabled 的 DOM 元素（如原生 `btn` 按钮）上。子元素若是 Fragment（本应用的
 * `<UploadButton/>` 就返回 Fragment），props 无处安放、被当恒真处理——无权限时
 * 既不禁用也不隐藏；hide 模式不受此限（它不碰子元素，只决定渲染与否）。
 */

export interface PermissionProps {
  /** 权限码（模块:资源:操作，如 skills:skill:create） */
  code: string;
  /** 受控元素（原生 `btn` 按钮；disabled 模式会给它设原生 disabled，见上方限制） */
  children: ReactElement<{ disabled?: boolean }>;
  /** mode='hide' 且无权限时的替代渲染 */
  fallback?: ReactNode;
  /** 默认 'hide'：无权限不渲染；'disabled'：无权限给子元素设 disabled（不能是 Fragment） */
  mode?: 'hide' | 'disabled';
}

export function Permission({
  code,
  children,
  fallback = null,
  mode = 'hide',
}: PermissionProps) {
  // 订阅权限内核：宿主权限可能晚于挂载到达（见 permission.ts），订阅后重新判定
  usePermissions();

  if (hasPermission(code)) return children;
  if (mode === 'disabled') return cloneElement(children, { disabled: true });
  return <>{fallback}</>;
}

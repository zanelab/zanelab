import type { ReactNode } from 'react';

interface AuthFormViewProps {
  /** 透传的 class（等价于 Vue 的 class attr 合并） */
  className?: string;

  /** data-side 标记：路由视图渲染位置 */
  dataSide?: 'bottom' | 'left' | 'right' | 'top';

  /** 路由视图内容（RouterView 等价：由父级传入当前认证页面） */
  children?: ReactNode;

  /** copyright 插槽 */
  copyright?: ReactNode;
}

/**
 * AuthFormView — 1:1 port of authentication/form.vue.
 * 裸容器（无卡片包装）。Reference 的 RouterView + Transition slide-right +
 * KeepAlive(['Login']) 在 React port 中由 React Router 的按路由重挂载承担
 * （children = 当前认证页元素，5 个 /auth/* 路由共用本容器）；路由级切换
 * 动画无 React 内建等价，多页切换时由各路由元素的 key 驱动重挂载。
 */
export function AuthFormView({
  className = '',
  dataSide,
  children,
  copyright,
}: AuthFormViewProps) {
  return (
    <div
      className={`flex-col-center bg-background dark:bg-background-deep relative px-6 py-10 lg:flex-initial lg:px-8 ${className}`}
    >
      {/* Router View 等价：认证页面表单 */}
      <div
        className="side-content mt-6 w-full sm:mx-auto md:max-w-md"
        data-side={dataSide}
      >
        {children}
      </div>

      {/* Footer Copyright */}
      <div className="text-muted-foreground absolute bottom-3 flex text-center text-xs">
        {copyright}
      </div>
    </div>
  );
}

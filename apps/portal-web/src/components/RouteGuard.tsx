import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { appConfig } from '../config';
import { useAuthStore } from '../stores/auth-store';
import { useMenuStore } from '../stores/menu-store';
import { findMenuByPath } from '@zanelab/utils';
import { isPublicSubAppPath } from '../router/auth-path';

// 路由守卫（§7.2）：
// - 无 token → loginPath（带 from 来源，登录后回跳）
// - 目标菜单有 permission 且权限集不含 → forbiddenPath
// - 否则渲染 children
// MenuItem 与 MenuRecordRaw 结构兼容（name/path/children），直传即可。

interface RouteGuardProps {
  children?: ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const token = useAuthStore((state) => state.token);
  const permissions = useMenuStore((state) => state.permissions);
  const menus = useMenuStore((state) => state.menus);
  const location = useLocation();

  // 免鉴权子应用路径（如 home）不要求登录；已登录时走菜单权限校验
  if (!token && isPublicSubAppPath(location.pathname)) {
    return <>{children ?? <Outlet />}</>;
  }

  if (!token) {
    const loginPath = appConfig.auth.loginPath;
    // 防御（09-07-guard-from-hardening）：守卫若被误挂载到登录页，
    // 把登录页 URL（含 from）再编码进 from 会指数嵌套，直至请求超限（431）。
    // 已在 loginPath 上时跳裸 loginPath，保证幂等不增长。
    if (location.pathname === loginPath) {
      return <Navigate to={loginPath} replace />;
    }
    const from = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${loginPath}?from=${from}`} replace />;
  }

  const menu = findMenuByPath(menus, location.pathname);
  const permission = (menu as { permission?: string } | undefined)?.permission;
  if (permission && !permissions.includes(permission)) {
    return <Navigate to={appConfig.route.forbiddenPath} replace />;
  }

  return <>{children ?? <Outlet />}</>;
}

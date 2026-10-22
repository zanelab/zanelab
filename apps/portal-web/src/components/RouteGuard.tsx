import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { appConfig } from '../config';
import { useAuthStore } from '../stores/auth-store';
import { useMenuStore } from '../stores/menu-store';
import { findMenuByPath } from '@zanelab/utils';

interface RouteGuardProps {
  children?: ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const token = useAuthStore((state) => state.token);
  const permissions = useMenuStore((state) => state.permissions);
  const menus = useMenuStore((state) => state.menus);
  const location = useLocation();

  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!token) {
    const loginPath = appConfig.auth.loginPath;

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

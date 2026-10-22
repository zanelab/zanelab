import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  Navigate,
  useLocation,
  useNavigate,
  useNavigationType,
  useRoutes,
} from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BasicLayout } from '@/components/layouts/basic/layout';
import { REFERENCE_VALUE } from '@/components/layouts/basic/header/header';
import { UserDropdown } from '@/components/layouts/widgets/user-dropdown/user-dropdown';
import { ChangePasswordModal } from '@/components/layouts/widgets/user-dropdown/change-password-modal';
import { TenantSwitcher } from '@/components/layouts/widgets/tenant-switcher/tenant-switcher';
import { Notification } from '@/components/layouts/widgets/notification/notification';
import { RouteGuard } from '@/components/RouteGuard';
import { useLayoutStore } from '@/stores/layout-store';
import { useAuthStore } from '@/stores/auth-store';
import { useMenuStore } from '@/stores/menu-store';
import { useSessionStore, getCurrentTenant } from '@/stores/session-store';
import { buildMenuRoutes, NotFoundPage } from '@/router/generateRoutes';
import { registerRoutes } from '@/router/route-meta';
import { appConfig } from '@/config';
import { watchGlobalLogout, bootstrapAfterAuth } from '@/micro/register';
import { SubAppLayer } from '@/micro/subapp-layer';
import { handleLogout } from '@/utils/auth';
import { cache } from '@zanelab/utils';
import { switchToPlatform, switchToTenant } from '@/utils/session';
import {
  collectDropdownMenus,
  toShellMenus,
  findFirstNavigablePath,
  hasMenuPath,
} from '@/utils/menu-views';
import type { DropdownMenuEntry } from '@/utils/menu-views';
import { AppIcon } from '@/components/icons/app-icon';
import type { UserDropdownMenu } from '@/components/layouts/widgets/user-dropdown/user-dropdown';
import type { MenuItem } from '@/types';

const LoginPage = lazy(() => import('@/pages/login'));
const LockPage = lazy(() => import('@/pages/lock'));
const RegisterPage = lazy(() => import('@/pages/auth/register'));
const CodeLoginPage = lazy(() => import('@/pages/auth/code-login'));
const QrCodeLoginPage = lazy(() => import('@/pages/auth/qrcode-login'));
const ForgetPasswordPage = lazy(() => import('@/pages/auth/forget-password'));

function Loading() {
  return (
    <div className="flex h-full items-center justify-center">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );
}

function LayoutShell() {
  const navigate = useNavigate();

  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const menus = useMenuStore((state) => state.menus);
  const user = useAuthStore((state) => state.user);
  const { isPlatform, tenantList } = useSessionStore();

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const displayName =
    (user?.user_metadata as Record<string, string> | undefined)?.nickname ||
    user?.email ||
    cache.get<{ username?: string }>('UserInfo')?.username ||
    '';

  const currentTenant = getCurrentTenant(tenantList);
  const tenantDisplay = currentTenant?.tenantName || '';

  useEffect(() => {
    const flat: Array<{
      path: string;
      title: string;
      i18nKey?: string;
      icon?: string;
    }> = [];
    const collect = (list: MenuItem[]) => {
      for (const m of list) {
        flat.push({
          path: m.path,
          title: m.name,
          i18nKey: m.i18nKey,
          icon: m.icon,
        });
        if (m.children) collect(m.children);
      }
    };
    collect(menus);
    registerRoutes(flat);
  }, [menus]);

  const menuRoutes = buildMenuRoutes(menus);

  const toUserDropdownMenus = (
    entries: DropdownMenuEntry[],
  ): UserDropdownMenu[] =>
    entries.map((entry) => ({
      text: entry.name,
      icon: entry.icon ? (
        <AppIcon name={entry.icon} className="size-4" />
      ) : undefined,
      handler: () => navigate(entry.path),
      ...(entry.children?.length
        ? { children: toUserDropdownMenus(entry.children) }
        : {}),
    }));

  const sessionMenus = useMemo<UserDropdownMenu[]>(() => {
    const result: UserDropdownMenu[] = [];
    if (appConfig.session.showPlatformManagement && isPlatform) {
      result.push({
        text: t('session.platformAdmin'),
        icon: <AppIcon name="system" className="size-4" />,
        handler: () => switchToPlatform(),
      });
    }
    const permTenants = tenantList.filter((tenant) => tenant.isPerm);
    if (appConfig.session.showTenantManagement && permTenants.length > 0) {
      result.push({
        text: t('session.tenantAdmin'),
        icon: (
          <AppIcon
            name="svg:M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"
            className="size-4"
          />
        ),
        handler: () => {},
        children: permTenants.map((tenant) => ({
          text: tenant.tenantName,
          handler: () => switchToTenant(tenant),
        })),
      });
    }
    return result;
  }, [isPlatform, tenantList, t, language]);

  const accountMenus = useMemo<UserDropdownMenu[]>(
    () => [
      {
        text: t('widgets.userDropdown.changePassword'),
        icon: <AppIcon name="key" className="size-4" />,
        handler: () => setChangePasswordOpen(true),
      },
    ],
    [t, language],
  );

  const dropdownMenus = [
    ...toUserDropdownMenus(collectDropdownMenus(menus)),
    ...sessionMenus,
    ...accountMenus,
  ];

  return useRoutes([
    {
      path: '/',
      element: (
        <BasicLayout
          menus={toShellMenus(menus)}
          contentLayer={<SubAppLayer />}
          rightExtra={
            appConfig.session.showTenantSwitcher ? (
              <TenantSwitcher />
            ) : undefined
          }

          rightExtraIndex={REFERENCE_VALUE + 5}
          userDropdown={
            <>
              <UserDropdown
                avatar=""
                text={displayName || 'Admin'}

                description={tenantDisplay}

                trigger="hover"
                hoverDelay={200}
                menus={dropdownMenus}
                onLogout={() => {
                  handleLogout();
                }}
                onLockScreen={(password: string) => {
                  useLayoutStore.getState().setLockScreenPassword(password);
                  navigate('/lock');
                }}
              />
              <ChangePasswordModal
                open={changePasswordOpen}
                onOpenChange={setChangePasswordOpen}
              />
            </>
          }
          notification={<Notification />}
        />
      ),
      children: [
        { index: true, element: <NavigateHome /> },

        {
          path: appConfig.route.homePath.replace(/^\//, ''),
          element: <NavigateHome />,
        },
        ...menuRoutes,

        { path: '*', element: <NotFoundOrFallback /> },
      ],
    },
  ]);
}

function NavigateHome() {
  const menus = useMenuStore((state) => state.menus);
  const target = findFirstNavigablePath(menus);
  if (target) {
    return <Navigate to={target} replace />;
  }

  return <Loading />;
}

function NotFoundOrFallback() {
  const menus = useMenuStore((state) => state.menus);
  const location = useLocation();
  if (!menus.length) return <Loading />;

  if (hasMenuPath(menus, location.pathname)) return <NotFoundPage />;
  const target = findFirstNavigablePath(menus);
  if (target && target !== location.pathname)
    return <Navigate to={target} replace />;
  return <NotFoundPage />;
}

export function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationType = useNavigationType();
  const token = useAuthStore((state) => state.token);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  useTranslation();

  useEffect(() => {
    useAuthStore.getState().init();
  }, []);

  useEffect(() => {
    if (isInitialized && token && !isAuthPath(location.pathname)) {
      bootstrapAfterAuth();
    }
  }, [isInitialized, token, location.pathname]);

  useEffect(() => watchGlobalLogout((path) => navigate(path)), [navigate]);

  if (!isInitialized) {
    return <Loading />;
  }

  if (isAuthPath(location.pathname)) {
    if (
      token &&
      navigationType === 'POP' &&
      location.pathname !== '/lock' &&
      !cameFromAppPage()
    ) {
      return <AuthRedirect />;
    }
    return <AuthRoutes />;
  }

  return (
    <Suspense fallback={<Loading />}>
      <RouteGuard>
        <LayoutShell />
      </RouteGuard>
    </Suspense>
  );
}

function AuthRoutes() {
  return useRoutes([
    { path: appConfig.auth.loginPath, element: <LoginPage /> },
    { path: '/auth/login', element: <LoginPage /> },
    { path: '/auth/register', element: <RegisterPage /> },
    { path: '/auth/code-login', element: <CodeLoginPage /> },
    { path: '/auth/qrcode-login', element: <QrCodeLoginPage /> },
    { path: '/auth/forget-password', element: <ForgetPasswordPage /> },
    { path: '/lock', element: <LockPage /> },
  ]);
}

function isAuthPath(pathname: string): boolean {
  const path = pathname.split('?')[0];
  return (
    path === appConfig.auth.loginPath ||
    path.startsWith('/auth/') ||
    path === '/lock'
  );
}

function cameFromAppPage(): boolean {
  const referrer = document.referrer;
  if (!referrer) return false;
  try {
    const url = new URL(referrer);
    return url.origin === window.location.origin && !isAuthPath(url.pathname);
  } catch {
    return false;
  }
}

function AuthRedirect() {
  const location = useLocation();
  const menus = useMenuStore((state) => state.menus);
  const from = new URLSearchParams(location.search).get('from') ?? '';
  const fallback = findFirstNavigablePath(menus) || appConfig.route.homePath;
  const target = from && !isAuthPath(from) ? from : fallback;
  return <Navigate to={target} replace />;
}

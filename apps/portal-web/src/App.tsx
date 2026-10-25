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
import { Notification } from '@/components/layouts/widgets/notification/notification';
import { RouteGuard } from '@/components/RouteGuard';
import { useLayoutStore } from '@/stores/layout-store';
import { useAuthStore } from '@/stores/auth-store';
import { useMenuStore } from '@/stores/menu-store';
import { useSessionStore, getCurrentTenant } from '@/stores/session-store';
import { buildMenuRoutes, NotFoundPage } from '@/router/generateRoutes';
import { registerRoutes } from '@/router/route-meta';
import { appConfig } from '@/config';
import {
  isAuthPath,
  isPublicAuthPath,
  isPublicSubAppPath,
} from '@/router/auth-path';
import { watchGlobalLogout } from '@/micro/register';
import { SubAppLayer } from '@/micro/subapp-layer';
import { handleLogout } from '@/utils/auth';
import { authApi } from '@/api/auth';
import { cache } from '@zanelab/utils';
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

// C3 链路（§5.1）：登录 → store(token/menus) → 动态路由 → BasicLayout(Outlet) 渲染。
// 边界（design §2）：壳组件只经 props 收数据；此处 host 层做装配。
// BasicLayout 内容区渲染 <Outlet /> —— 菜单路由必须作为其子路由传入。

function Loading() {
  return (
    <div className="flex h-full items-center justify-center">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );
}

// ── 布局壳：菜单来自 menu store；菜单路由作为 BasicLayout 的子路由（Outlet 渲染） ──
function LayoutShell() {
  const navigate = useNavigate();
  const location = useLocation();

  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const menus = useMenuStore((state) => state.menus);
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const { tenantList } = useSessionStore();

  // 修改密码弹窗开关（入口在用户下拉菜单，见 accountMenus）
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  // 从缓存兜底读取用户名（刷新瞬间 restoreSession 还没写 store 时 user 为 null）
  const displayName =
    user?.nickname ||
    user?.username ||
    cache.get<{ username?: string }>('UserInfo')?.username ||
    '';

  // 从 session store 获取当前租户名称（getCurrentTenant 有 cache fallback 逻辑）
  const currentTenant = getCurrentTenant(tenantList);
  const tenantDisplay = currentTenant?.tenantName || '';

  useEffect(() => {
    // 菜单就绪后把 path/title 注册进 route-meta（tabbar/面包屑消费）——
    // 走全量菜单树：user-dropdown 类型不进侧边栏，但其页面仍需要 tab 标题/面包屑。
    // title 存原始 name、i18nKey 随契约存（09-09-i18n）：翻译在渲染期经
    // menuTitle 解析，切语言后无需重新注册。
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

  // homePath 是否指向子应用 activeRule（如 /home）——此时该路由只做占位
  const homePathIsSubApp = Object.values(appConfig.microApps).some(
    (cfg) =>
      cfg.activeRule &&
      (appConfig.route.homePath === cfg.activeRule ||
        appConfig.route.homePath.startsWith(`${cfg.activeRule}/`)),
  );

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

  // 账号相关菜单（迁移自旧项目 layouts/PaLayout/Avatar.tsx + PassWordForm.tsx）：
  // 「修改密码」打开改密弹窗。
  // 文案在 useMemo 内取，需以 language 为依赖才会随语言重算。
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
    ...accountMenus,
  ];

  return useRoutes([
    {
      path: '/',
      element: (
        <BasicLayout
          menus={toShellMenus(menus)}
          contentLayer={<SubAppLayer />}
          rightExtraIndex={REFERENCE_VALUE + 5}
          userDropdown={
            token ? (
              <>
                <UserDropdown
                  avatar=""
                  text={displayName || 'Admin'}
                  description={tenantDisplay}
                  // 悬停展开，延迟 200ms 兼顾锚点→面板穿越与收起手感
                  trigger="hover"
                  hoverDelay={200}
                  menus={dropdownMenus}
                  onLogout={() => {
                    // 显式传 token：raw axios 同步组装请求头（token 写入 config），
                    // 之后 handleLogout 清 store 不影响已组装的请求
                    const t = useAuthStore.getState().token;
                    authApi.logout(t).catch(() => {});
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
            ) : (
              // 未登录：头像位显示登录按钮，点击跳登录页（带 from 回跳）
              <button
                type="button"
                className="btn btn-primary btn-sm mr-6"
                onClick={() => {
                  const from = encodeURIComponent(
                    location.pathname + location.search,
                  );
                  navigate(
                    isPublicSubAppPath(location.pathname) ||
                      location.pathname === '/'
                      ? appConfig.auth.loginPath
                      : `${appConfig.auth.loginPath}?from=${from}`,
                  );
                }}
              >
                {t('widgets.userDropdown.login')}
              </button>
            )
          }
          notification={<Notification />}
        />
      ),
      children: [
        { index: true, element: <NavigateHome /> },

        // homePath 可能不在菜单路由中（如 /dashboard），单独加重定向到第一个菜单路径
        {
          path: appConfig.route.homePath.replace(/^\//, ''),
          // homePath 指向子应用 activeRule 时渲染空占位：内容由 SubAppLayer
          // 常驻层承载（未登录也可见）。NavigateHome 依赖菜单，菜单未就绪
          // （未登录/拉取中）会死等 Loading 且把子应用盖住。
          element: homePathIsSubApp ? null : <NavigateHome />,
        },
        ...menuRoutes,

        // 兜底：见 NotFoundOrFallback（菜单未就绪 → loading；当前路径已不在
        // 菜单树 → 回到第一个可用菜单；确实无处可去 → 404）
        { path: '*', element: <NotFoundOrFallback /> },
      ],
    },
  ]);
}

/** 重定向到第一个可导航菜单路径；菜单未加载时显示 loading */
function NavigateHome() {
  const menus = useMenuStore((state) => state.menus);
  const target = findFirstNavigablePath(menus);
  if (target) {
    return <Navigate to={target} replace />;
  }

  // 菜单未就绪：显示 loading（等菜单加载后 store 变化触发重渲染 → 重定向）
  return <Loading />;
}

/**
 * 菜单路由之后的 `*` 兜底：
 * - 菜单未就绪 → loading（等菜单加载后重试，此时不能误判 404）
 * - 菜单已就绪，且当前 path 在菜单树里：菜单下发了该路径但子应用未注册
 *   （elementFor 不产占位路由）→ 显示 404，不重定向（09-14：避免强制重定向
 *   导致用户点击未注册子应用后被甩回第一个菜单，无法停在 404）
 * - 菜单已就绪，且当前 path 不在菜单树（URL 在当前菜单集里已不存在）
 *   → 回到第一个可用菜单，避免 404（保留原设计）
 * - 确实没有可用菜单 → 404
 *
 * 目标与当前路径相同时不再跳转（replace 同址会反复触发匹配）。
 */
function NotFoundOrFallback() {
  const menus = useMenuStore((state) => state.menus);
  const location = useLocation();
  if (!menus.length) return <Loading />;

  // path 在菜单树但落到此 → 子应用未注册，稳定显示 404
  if (hasMenuPath(menus, location.pathname)) return <NotFoundPage />;
  const target = findFirstNavigablePath(menus);
  if (target && target !== location.pathname)
    return <Navigate to={target} replace />;
  return <NotFoundPage />;
}

// ── App：认证页不走守卫（否则未登录重定向到 login 后守卫仍挂载，
// Navigate 每次渲染都触发 → 无限导航循环）；受保护区由 RouteGuard 包裹 ──
export function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // 进入方式：'POP' = 手输 URL / 刷新 / 书签 / 前进后退；'PUSH'|'REPLACE' = 应用内跳转
  const navigationType = useNavigationType();
  const token = useAuthStore((state) => state.token);

  // 装配层随语言重渲染（09-09-i18n design §4）：menuTitle 是 i18n.t 直调而非
  // hook 消费，App（及 LayoutShell 装配链）订阅语言变化后 toShellMenus /
  // collectDropdownMenus 等纯函数自然以新语言重算。t 本身不在装配层使用，
  // 仅取订阅副作用。
  useTranslation();

  useEffect(() => watchGlobalLogout((path) => navigate(path)), [navigate]);

  // 裸渲染仅限「免鉴权 ∩ 认证页」（iam 登录页等）；免鉴权内容页（home）
  // 带壳渲染，登录前后容器位置不变。已登录回退到登录页转 AuthRedirect。
  if (!token && isPublicAuthPath(location.pathname)) {
    return <BareSubAppHost />;
  }

  if (token && isPublicAuthPath(location.pathname)) {
    // 已登录经浏览器回退（POP）落到登录页时不再重复展示，直接回应用页
    if (
      navigationType === 'POP' &&
      location.pathname !== '/lock' &&
      !cameFromAppPage()
    ) {
      return <AuthRedirect />;
    }
    return <BareSubAppHost />;
  }

  // 未登录访问根路径：homePath 免鉴权时直接落到首页（而非登录页）
  if (
    !token &&
    location.pathname === '/' &&
    isPublicSubAppPath(appConfig.route.homePath)
  ) {
    return <Navigate to={appConfig.route.homePath} replace />;
  }

  if (isAuthPath(location.pathname)) {
    // 已登录（token 有效）时「直接进入」认证页 —— 手输 /login、刷新、书签、
    // 前进后退 —— 直接送回应用，不再停在登录页（09-28 修复：token 未过期
    // 手动访问 /login 却看到登录页）。
    //
    // 只在 POP 时重定向：应用内跳转（锁屏「返回登录」/lock → /auth/login 是
    // PUSH，此时 token 仍在）必须保留登录页入口，否则锁屏无法切换账号。
    // /lock 例外：锁屏本身就是登录态下的页面。
    // cameFromAppPage()：排除子应用 401 兜底的整页跳转（见该函数注释）。
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

// 公开子应用宿主：无壳（无 LayoutShell/RouteGuard），仅挂常驻容器层，
// 供未登录可访问的 public 子应用（如 iam-web 登录页）渲染。
function BareSubAppHost() {
  return (
    <Suspense fallback={<Loading />}>
      <SubAppLayer />
    </Suspense>
  );
}

function AuthRoutes() {
  return useRoutes([
    { path: appConfig.auth.loginPath, element: <LoginPage /> },
    { path: '/auth/login', element: <LoginPage /> },
    { path: '/lock', element: <LockPage /> },
  ]);
}

/**
 * 本轮导航是否是「从应用内其它页面整页跳过来的」。
 *
 * 用来区分两类认证页访问：
 * - 手输 URL / 书签 / 前进后退 → referrer 为空；刷新 → referrer 就是当前认证页
 *   → 属于「用户自己闯进来的」，已登录应送回应用。
 * - 子应用 401 兜底：`window.location.href = '/login'` → referrer
 *   是某个应用页 → 这是子应用**明确要求看登录页**，若再送回应用会与应用重挂载
 *   后的 401 互相顶成「整页刷新死循环」，故保持登录页（= 改造前行为）。
 */
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

/**
 * 已登录时访问认证页 → 送回应用。
 *
 * 落点与登录成功后一致（见 pages/login）：from 来源 → 菜单树第一个可导航路径
 * → homePath。from 指回认证页时忽略，否则会在认证页之间来回跳。
 */
function AuthRedirect() {
  const location = useLocation();
  const menus = useMenuStore((state) => state.menus);
  const from = new URLSearchParams(location.search).get('from') ?? '';
  const fallback = findFirstNavigablePath(menus) || appConfig.route.homePath;
  const target = from && !isAuthPath(from) ? from : fallback;
  return <Navigate to={target} replace />;
}

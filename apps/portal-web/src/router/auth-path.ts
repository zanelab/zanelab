import { appConfig } from '../config';

// 认证页路径：宿主内置登录/注册/锁屏等（无壳渲染，RouteGuard 之外）。
// loginPath 用 startsWith 匹配——loginPath 可能指向子应用路由（如 /iam/login），
// 其子路径（如 /iam/login/sso 回调）同样属于认证路径。
export function isAuthPath(pathname: string): boolean {
  const path = pathname.split('?')[0];
  return (
    path.startsWith(appConfig.auth.loginPath) ||
    path.startsWith('/auth/') ||
    path === '/lock'
  );
}

// 免鉴权子应用路径。public 支持两种形态（见 MicroAppConfig）：
//   true        —— 整个 activeRule 前缀免登录（如承载登录页的 iam）；
//   string[]    —— 仅列出的 activeRule 子路径免登录（如 home 的 ['/home']）。
export function isPublicSubAppPath(pathname: string): boolean {
  const path = pathname.split('?')[0];
  return Object.values(appConfig.microApps).some((cfg) => {
    if (!cfg.activeRule) return false;
    if (cfg.public === true) return path.startsWith(cfg.activeRule);
    if (Array.isArray(cfg.public)) {
      return cfg.public.some((p) => path.startsWith(p));
    }
    return false;
  });
}

// 裸渲染（无壳）路径 = 免鉴权 ∩ 认证页：未登录可访问的认证类子应用页
// （如 iam 登录页）。免鉴权的内容页（如 home）不在此列——它们带壳渲染。
export function isPublicAuthPath(pathname: string): boolean {
  return isPublicSubAppPath(pathname) && isAuthPath(pathname);
}

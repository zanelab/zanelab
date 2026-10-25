import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { AuthPageLayout } from '@/components/layouts/authentication/authentication';
import type { ToolbarType } from '@/components/layouts/authentication/types';
import { AuthenticationLogin } from '@/components/layouts/authentication/forms/login';
import { useConfig } from '@/contexts/ConfigContext';
import { notify, syncNavigate } from '@zanelab/utils';
import { bootstrapSession } from '@/micro/register';
import { useMenuStore } from '@/stores/menu-store';
import { findFirstNavigablePath } from '@/utils/menu-views';

/**
 * 登录页（C3）：表单提交接真实链路 authApi.login →
 * bootstrapSession（存 token、拉菜单、menuSlice.setMenus）→ 回跳 from 来源。
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const config = useConfig();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);

  // from 优先取 URL 参数，否则取菜单树第一个可访问路径，兜底 homePath
  const from = searchParams.get('from') || '';

  // 右上工具栏（AuthPageLayout 的 Toolbar）显隐：颜色/布局由 config.auth.loginPage
  // 控制（部署期可关，免重编译）；语言/主题沿用原有 preferences.widget 开关（Toolbar 内判定）
  const { loginPage } = config.auth;
  const toolbarList: ToolbarType[] = [];
  if (loginPage.showColorToggle) toolbarList.push('color');
  toolbarList.push('language');
  if (loginPage.showLayoutToggle) toolbarList.push('layout');
  toolbarList.push('theme');

  return (
    <AuthPageLayout
      // 应用名由 AuthPageLayout 按当前语言取系统名（config.js system.name / nameEn）
      pageTitle={t('auth.page.loginTitle')}
      pageDescription={t('auth.page.loginDescription')}
      toolbarList={toolbarList}
      clickLogo={() => navigate(config.route.homePath)}
    >
      <AuthenticationLogin
        loading={loading}
        showCodeLogin={config.auth.loginPage.showCodeLogin}
        showQrcodeLogin={config.auth.loginPage.showQrcodeLogin}
        showThirdPartyLogin={config.auth.loginPage.showThirdPartyLogin}
        showRegister={config.auth.loginPage.showRegister}
        showForgetPassword={config.auth.loginPage.showForgetPassword}
        showRememberMe={config.auth.loginPage.showRememberMe}
        onSubmit={async (values: { username?: string; password?: string }) => {
          setLoading(true);
          try {
            // 动态引入避免登录页打包进主 chunk（也避免 mock 未就绪时的循环依赖）
            const { authApi } = await import('@/api/auth');
            const result = await authApi.login({
              username: values.username ?? 'admin',
              password: values.password ?? '123456',
            });
            await bootstrapSession(
              result.token,
              result.refreshToken,
              result.user,
            );
            notify.success(t('auth.loginSuccess'));

            // 登录后跳转：优先 from 参数，否则取第一个可导航菜单路径，兜底 homePath
            const menus = useMenuStore.getState().menus;
            const firstMenuPath = findFirstNavigablePath(menus);
            const target = from || firstMenuPath || config.route.homePath;

            // 跨 auth↔layout 树导航必须同步提交（syncNavigate）：qiankun 已加载
            // 子应用的 remount 在微任务链上查 #subapp-container，transition 延迟
            // 提交会让容器缺席 → 子应用 died（09-09）
            syncNavigate(navigate, target, { replace: true });
          } catch (error) {
            // 拦截器已 notify 具体错误；此处只保留 loading 复位
            notify.error(
              error instanceof Error ? error.message : t('auth.loginFailed'),
            );
          } finally {
            setLoading(false);
          }
        }}
      />
    </AuthPageLayout>
  );
}

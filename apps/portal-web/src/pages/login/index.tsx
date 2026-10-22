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

export default function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const config = useConfig();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);

  const from = searchParams.get('from') || '';

  const toolbarList: ToolbarType[] = [];
  toolbarList.push('color');
  toolbarList.push('language');
  toolbarList.push('layout');
  toolbarList.push('theme');

  return (
    <AuthPageLayout
      pageTitle={t('auth.page.loginTitle')}
      pageDescription={t('auth.page.loginDescription')}
      toolbarList={toolbarList}
      clickLogo={() => navigate(config.route.homePath)}
    >
      <AuthenticationLogin
        loading={loading}
        onSubmit={async (values: { username?: string; password?: string }) => {
          setLoading(true);
          try {
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

            const menus = useMenuStore.getState().menus;
            const firstMenuPath = findFirstNavigablePath(menus);
            const target = from || firstMenuPath || config.route.homePath;

            syncNavigate(navigate, target, { replace: true });
          } catch (error) {
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

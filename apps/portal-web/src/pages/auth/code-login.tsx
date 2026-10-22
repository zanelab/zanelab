import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { AuthPageLayout } from '@/components/layouts/authentication/authentication';
import { AuthenticationCodeLogin } from '@/components/layouts/authentication/forms/code-login';

export default function CodeLoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <AuthPageLayout
      pageTitle={t('auth.page.sloganTitle')}
      pageDescription={t('auth.page.sloganDescription')}
      clickLogo={() => navigate('/')}
    >
      <AuthenticationCodeLogin loading={false} onSubmit={() => void 0} />
    </AuthPageLayout>
  );
}

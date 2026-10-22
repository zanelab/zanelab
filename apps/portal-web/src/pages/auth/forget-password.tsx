import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { AuthPageLayout } from '@/components/layouts/authentication/authentication';
import { ForgetPassword } from '@/components/layouts/authentication/forms/forget-password';

export default function ForgetPasswordPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <AuthPageLayout
      pageTitle={t('auth.page.sloganTitle')}
      pageDescription={t('auth.page.sloganDescription')}
      clickLogo={() => navigate('/')}
    >
      <ForgetPassword loading={false} onSubmit={() => void 0} />
    </AuthPageLayout>
  );
}

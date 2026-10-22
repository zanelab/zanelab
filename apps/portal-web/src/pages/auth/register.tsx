import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { AuthPageLayout } from '@/components/layouts/authentication/authentication';
import { RegisterForm } from '@/components/layouts/authentication/forms/register';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <AuthPageLayout
      pageTitle={t('auth.page.sloganTitle')}
      pageDescription={t('auth.page.sloganDescription')}
      clickLogo={() => navigate('/')}
    >
      <RegisterForm loading={false} onSubmit={() => void 0} />
    </AuthPageLayout>
  );
}

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { AuthPageLayout } from '@/components/layouts/authentication/authentication';
import { AuthenticationQrCodeLogin } from '@/components/layouts/authentication/forms/qrcode-login';

export default function QrCodeLoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <AuthPageLayout
      pageTitle={t('auth.page.sloganTitle')}
      pageDescription={t('auth.page.sloganDescription')}
      clickLogo={() => navigate('/')}
    >
      <AuthenticationQrCodeLogin />
    </AuthPageLayout>
  );
}

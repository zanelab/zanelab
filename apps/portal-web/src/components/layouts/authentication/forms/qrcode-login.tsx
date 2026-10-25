import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';

import { AuthTitle } from './auth-title';

/**
 * AuthenticationQrCodeLogin — 1:1 port of common-ui/ui/authentication/qrcode-login.vue.
 * useQRCode（@vueuse/integrations）→ qrcode 包 toDataURL 的 effect 等价
 * （errorCorrectionLevel: 'H'，margin: 4 与 reference 选项一致）。
 */

interface QrCodeLoginProps {
  loading?: boolean;
  loginPath?: string;
  title?: string;
  subTitle?: string;
  submitButtonText?: string;

  /** 二维码下方提示文案（等价 description） */
  description?: string;
  showBack?: boolean;
  slotTitle?: ReactNode;
  slotSubTitle?: ReactNode;
  slotDescription?: ReactNode;
}

export function AuthenticationQrCodeLogin({
  loading = false,
  loginPath = '/auth/login',
  title = '',
  subTitle = '',
  description = '',
  showBack = true,
  slotTitle,
  slotSubTitle,
  slotDescription,
}: QrCodeLoginProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // 扫码登录演示内容 —— 实际接入时由后端下发登录 ticket URL
  const [text] = useState('https://zanelab.local');
  const [qrcode, setQrcode] = useState('');

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H',
      margin: 4,
    }).then((url) => {
      if (!cancelled) setQrcode(url);
    });
    return () => {
      cancelled = true;
    };
  }, [text]);

  return (
    <div>
      <AuthTitle
        slotDesc={
          <span className="text-muted-foreground">
            {slotSubTitle ?? (subTitle || t('auth.qrcodeLogin.subTitle'))}
          </span>
        }
      >
        {slotTitle ?? (title || t('auth.qrcodeLogin.title'))}
      </AuthTitle>

      <div className="flex-col-center mt-6">
        {qrcode ? (
          <img src={qrcode} alt="qrcode" className="w-1/2" />
        ) : (
          <div className="aspect-square w-1/2" />
        )}
        <p className="text-muted-foreground mt-4 text-sm">
          {slotDescription ??
            (description || t('auth.qrcodeLogin.description'))}
        </p>
      </div>

      {showBack ? (
        <button
          type="button"
          className="btn btn-outline mt-4 w-full"
          disabled={loading}
          onClick={() => navigate(loginPath)}
        >
          {t('common.back')}
        </button>
      ) : null}
    </div>
  );
}

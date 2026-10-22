import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { z } from 'zod';

import { AuthTitle } from './auth-title';
import { ThirdPartyLogin } from './third-party-login';

const buildLoginSchema = (t: TFunction) =>
  z.object({
    username: z
      .string()
      .min(1, { message: t('auth.validation.usernameRequired') }),
    password: z
      .string()
      .min(1, { message: t('auth.validation.passwordRequired') }),
  });

export interface LoginFormValues {
  password: string;
  username: string;
}

interface AuthenticationLoginProps {
  codeLoginPath?: string;
  forgetPasswordPath?: string;

  loading?: boolean;
  qrCodeLoginPath?: string;
  registerPath?: string;
  showCodeLogin?: boolean;
  showForgetPassword?: boolean;
  showQrcodeLogin?: boolean;
  showRegister?: boolean;
  showRememberMe?: boolean;
  showThirdPartyLogin?: boolean;
  submitButtonText?: string;
  subTitle?: string;
  title?: string;

  onSubmit?: (values: LoginFormValues) => void;

  slotTitle?: ReactNode;

  slotSubTitle?: ReactNode;

  slotThirdPartyLogin?: ReactNode;

  slotToRegister?: ReactNode;
}

const REMEMBER_ME_KEY = `REMEMBER_ME_USERNAME_${location.hostname}`;

const REMEMBER_ME_PASSWORD_KEY = `REMEMBER_ME_PASSWORD_${location.hostname}`;

export function AuthenticationLogin({
  codeLoginPath = '/auth/code-login',
  forgetPasswordPath = '/auth/forget-password',
  loading = false,
  qrCodeLoginPath = '/auth/qrcode-login',
  registerPath = '/auth/register',
  showCodeLogin = true,
  showForgetPassword = true,
  showQrcodeLogin = true,
  showRegister = true,
  showRememberMe = true,
  showThirdPartyLogin = true,
  submitButtonText = '',
  subTitle = '',
  title = '',
  onSubmit,
  slotTitle,
  slotSubTitle,
  slotThirdPartyLogin,
  slotToRegister,
}: AuthenticationLoginProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const localUsername = localStorage.getItem(REMEMBER_ME_KEY) || '';
  const localPassword = localStorage.getItem(REMEMBER_ME_PASSWORD_KEY) || '';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(!!localUsername);
  const [errors, setErrors] = useState<{
    password?: string;
    username?: string;
  }>({});

  useEffect(() => {
    if (localUsername) {
      setUsername(localUsername);
    }
    if (localPassword) {
      setPassword(localPassword);
    }
  }, [localUsername, localPassword]);

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const parsed = buildLoginSchema(t).safeParse({ password, username });
    if (parsed.success) {
      setErrors({});

      localStorage.setItem(
        REMEMBER_ME_KEY,
        rememberMe ? parsed.data.username : '',
      );
      localStorage.setItem(
        REMEMBER_ME_PASSWORD_KEY,
        rememberMe ? parsed.data.password : '',
      );
      onSubmit?.(parsed.data);
    } else {
      const next: { password?: string; username?: string } = {};
      for (const issue of parsed.error.issues) {
        next[issue.path[0] as 'password' | 'username'] = issue.message;
      }
      setErrors(next);
    }
  }

  return (
    <form
      className="space-y-4"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSubmit();
        }
      }}
    >
      {slotTitle ?? (
        <AuthTitle
          slotDesc={
            <span className="text-muted-foreground">
              {slotSubTitle ?? (subTitle || t('auth.login.subTitle'))}
            </span>
          }
        >
          {title || t('auth.login.title')}
        </AuthTitle>
      )}

      <div>
        <input
          type="text"
          className="input input-bordered w-full"
          placeholder={t('auth.validation.usernameRequired')}
          value={username}
          aria-invalid={!!errors.username}
          onChange={(e) => setUsername(e.target.value)}
        />
        {errors.username ? (
          <p className="text-destructive mt-1 text-xs">{errors.username}</p>
        ) : null}
      </div>

      <div>
        <input
          type="password"
          className="input input-bordered w-full"
          placeholder={t('auth.validation.passwordRequired')}
          value={password}
          aria-invalid={!!errors.password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {errors.password ? (
          <p className="text-destructive mt-1 text-xs">{errors.password}</p>
        ) : null}
      </div>

      {showRememberMe || showForgetPassword ? (
        <div className="mb-6 flex justify-between">
          <div className="flex-center">
            {showRememberMe ? (
              <label className="label cursor-pointer justify-start gap-2 text-sm font-normal">
                <input
                  type="checkbox"
                  name="rememberMe"
                  className="checkbox checkbox-sm checkbox-primary"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                {t('auth.login.rememberMe')}
              </label>
            ) : null}
          </div>
          {showForgetPassword ? (
            <span
              role="button"
              tabIndex={0}
              className="vben-link text-sm font-normal"
              onClick={() => navigate(forgetPasswordPath)}
              onKeyDown={(e) =>
                e.key === 'Enter' && navigate(forgetPasswordPath)
              }
            >
              {t('auth.login.forgotPassword')}
            </span>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        aria-label="login"
        className={`btn btn-primary w-full ${loading ? 'cursor-wait' : ''}`}
        disabled={loading}
        onClick={(e) => handleSubmit(e)}
      >
        {loading ? (
          <span className="loading loading-spinner loading-xs" />
        ) : null}
        {submitButtonText || t('auth.login.submit')}
      </button>

      {showCodeLogin || showQrcodeLogin ? (
        <div className="mt-4 mb-2 flex items-center justify-between">
          {showCodeLogin ? (
            <button
              type="button"
              className="btn btn-outline w-1/2"
              onClick={() => navigate(codeLoginPath)}
            >
              {t('auth.login.phoneLogin')}
            </button>
          ) : null}
          {showQrcodeLogin ? (
            <button
              type="button"
              className="btn btn-outline ml-4 w-1/2"
              onClick={() => navigate(qrCodeLoginPath)}
            >
              {t('auth.login.qrcodeLogin')}
            </button>
          ) : null}
        </div>
      ) : null}

      {slotThirdPartyLogin ??
        (showThirdPartyLogin ? <ThirdPartyLogin /> : null)}

      {slotToRegister ??
        (showRegister ? (
          <div className="mt-3 text-center text-sm">
            {t('auth.login.noAccount')}
            <span
              role="button"
              tabIndex={0}
              className="vben-link text-sm font-normal"
              onClick={() => navigate(registerPath)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(registerPath)}
            >
              {t('auth.login.createAccount')}
            </span>
          </div>
        ) : null)}
    </form>
  );
}

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { z } from 'zod';

import { AuthTitle } from './auth-title';

const CODE_LENGTH = 6;
const MAX_TIME = 60;

const buildCodeLoginSchema = (t: TFunction) =>
  z.object({
    code: z.string().length(CODE_LENGTH, {
      message: t('auth.validation.codeRequired', { length: CODE_LENGTH }),
    }),
    phoneNumber: z
      .string()
      .min(1, { message: t('auth.validation.phoneRequired') })
      .refine((v) => /^\d{11}$/.test(v), {
        message: t('auth.validation.phoneInvalid'),
      }),
  });

interface CodeLoginProps {
  loading?: boolean;
  loginPath?: string;
  title?: string;
  subTitle?: string;
  submitButtonText?: string;
  showBack?: boolean;
  onSubmit?: (values: { code: string; phoneNumber: string }) => void;
  slotTitle?: ReactNode;
  slotSubTitle?: ReactNode;
  slotSubmitButtonText?: ReactNode;
}

export function AuthenticationCodeLogin({
  loading = false,
  loginPath = '/auth/login',
  title = '',
  subTitle = '',
  submitButtonText = '',
  showBack = true,
  onSubmit,
  slotTitle,
  slotSubTitle,
  slotSubmitButtonText,
}: CodeLoginProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [values, setValues] = useState({ code: '', phoneNumber: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [countdown]);

  async function handleSendCode() {
    const phone = values.phoneNumber;
    const phoneValid = phone.length >= 1 && /^\d{11}$/.test(phone);
    if (!phoneValid) {
      setErrors((prev) => ({
        ...prev,
        phoneNumber: phone
          ? t('auth.validation.phoneInvalid')
          : t('auth.validation.phoneRequired'),
      }));
      return;
    }
    setErrors((prev) => ({ ...prev, phoneNumber: '' }));
    setSending(true);

    await new Promise((resolve) => setTimeout(resolve, 3000));
    setSending(false);
    setCountdown(MAX_TIME);
  }

  function handleSend(e: React.MouseEvent) {
    e.preventDefault();
    if (sending || countdown > 0) return;
    void handleSendCode();
  }

  const sendButtonText =
    countdown > 0
      ? t('auth.codeLogin.resendIn', { count: countdown })
      : t('auth.codeLogin.getCode');
  const sendButtonDisabled = sending || countdown > 0;

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const parsed = buildCodeLoginSchema(t).safeParse(values);
    if (parsed.success) {
      setErrors({});
      onSubmit?.(parsed.data);
    } else {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        next[issue.path.join('.')] = issue.message;
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
      <AuthTitle
        slotDesc={
          <span className="text-muted-foreground">
            {slotSubTitle ?? (subTitle || t('auth.codeLogin.subTitle'))}
          </span>
        }
      >
        {slotTitle ?? (title || t('auth.codeLogin.title'))}
      </AuthTitle>

      <div>
        <input
          type="tel"
          className="input input-bordered w-full"
          placeholder={t('auth.validation.phoneRequired')}
          value={values.phoneNumber}
          aria-invalid={!!errors.phoneNumber}
          onChange={(e) =>
            setValues((v) => ({ ...v, phoneNumber: e.target.value }))
          }
        />
        {errors.phoneNumber ? (
          <p className="text-destructive mt-1 text-xs">{errors.phoneNumber}</p>
        ) : null}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          className="input input-bordered w-full"
          placeholder={t('auth.codeLogin.codePlaceholder')}
          value={values.code}
          aria-invalid={!!errors.code}
          onChange={(e) => setValues((v) => ({ ...v, code: e.target.value }))}
        />
        <button
          type="button"
          className="btn btn-outline shrink-0 text-sm"
          disabled={sendButtonDisabled}
          onClick={handleSend}
        >
          {sending ? (
            <span className="loading loading-spinner loading-xs" />
          ) : null}
          {sendButtonText}
        </button>
      </div>
      {errors.code ? (
        <p className="text-destructive text-xs">{errors.code}</p>
      ) : null}

      <button
        type="submit"
        className={`btn btn-primary w-full ${loading ? 'cursor-wait' : ''}`}
        disabled={loading}
        onClick={(e) => handleSubmit(e)}
      >
        {loading ? (
          <span className="loading loading-spinner loading-xs" />
        ) : null}
        {slotSubmitButtonText ??
          (submitButtonText || t('auth.codeLogin.submit'))}
      </button>

      {showBack ? (
        <button
          type="button"
          className="btn btn-outline mt-4 w-full"
          onClick={() => navigate(loginPath)}
        >
          {t('common.back')}
        </button>
      ) : null}
    </form>
  );
}

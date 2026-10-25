import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { z } from 'zod';

import { AuthTitle } from './auth-title';

/**
 * ForgetPassword — 1:1 port of common-ui/ui/authentication/forget-password.vue.
 * 上游 schema 表单引擎 → 受控 input + zod（等价参考实现 playground
 * forget-password.vue 的 rules：email min(1) "请输入邮箱"（emailTip）+
 * email 格式 "你输入的邮箱格式不正确"（emailValidErrorTip）—— 空值与
 * 格式错误区分提示）。
 */
/** 校验文案走语言包（提交时按当前语言构建） */
const buildForgetPasswordSchema = (t: TFunction) =>
  z.object({
    email: z
      .string()
      .min(1, { message: t('auth.validation.emailRequired') })
      .email({ message: t('auth.validation.emailInvalid') }),
  });

interface ForgetPasswordProps {
  loading?: boolean;
  loginPath?: string;
  title?: string;
  subTitle?: string;
  submitButtonText?: string;
  onSubmit?: (values: { email: string }) => void;
  slotTitle?: ReactNode;
  slotSubTitle?: ReactNode;
  slotSubmitButtonText?: ReactNode;
}

export function ForgetPassword({
  loading = false,
  loginPath = '/auth/login',
  title = '',
  subTitle = '',
  submitButtonText = '',
  onSubmit,
  slotTitle,
  slotSubTitle,
  slotSubmitButtonText,
}: ForgetPasswordProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const parsed = buildForgetPasswordSchema(t).safeParse({ email });
    if (parsed.success) {
      setError('');
      onSubmit?.(parsed.data);
    } else {
      setError(parsed.error.issues[0]?.message ?? '');
    }
  }

  return (
    // @keydown.enter.prevent（forget-password.vue:60）—— 显式 preventDefault
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
            {slotSubTitle ?? (subTitle || t('auth.forgetPassword.subTitle'))}
          </span>
        }
      >
        {slotTitle ?? (title || t('auth.forgetPassword.title'))}
      </AuthTitle>

      <div>
        <input
          type="email"
          className="input input-bordered w-full"
          placeholder="example@example.com"
          value={email}
          aria-invalid={!!error}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error ? (
          <p className="text-destructive mt-1 text-xs">{error}</p>
        ) : null}
      </div>

      <div>
        <button
          type="submit"
          aria-label="submit"
          className={`btn btn-primary mt-2 w-full ${loading ? 'cursor-wait' : ''}`}
          disabled={loading}
          onClick={(e) => handleSubmit(e)}
        >
          {loading ? (
            <span className="loading loading-spinner loading-xs" />
          ) : null}
          {slotSubmitButtonText ??
            (submitButtonText || t('auth.forgetPassword.submit'))}
        </button>
        <button
          type="button"
          className="btn btn-outline mt-4 w-full"
          onClick={() => navigate(loginPath)}
        >
          {t('common.back')}
        </button>
      </div>
    </form>
  );
}

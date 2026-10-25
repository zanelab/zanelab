import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { z } from 'zod';

import { AuthTitle } from './auth-title';

/**
 * RegisterForm — 1:1 port of common-ui/ui/authentication/register.vue.
 * 上游 schema 表单引擎 → 受控 input + zod（等价参考实现 playground register.vue 的
 * rules：username min(1)、password min(1)、confirmPassword 与 password 的
 * refine 一致性校验（dependencies.triggerFields: ['password'] —— password
 * 变化时重校验，见下方 effect）、agreePolicy 必须勾选）。
 *
 * 上游密码输入组件（passwordStrength: true）→ PasswordStrength 组件
 * （input-password/password-strength.vue 的 1:1 port：5 段强度条 +
 * "使用 8 个或更多字符，混合字母、数字和符号" 提示）。
 */
/** 校验文案走语言包（提交时按当前语言构建） */
const buildRegisterSchema = (t: TFunction) =>
  z
    .object({
      username: z
        .string()
        .min(1, { message: t('auth.validation.usernameRequired') }),
      password: z
        .string()
        .min(1, { message: t('auth.validation.passwordRequired') }),
      confirmPassword: z
        .string()
        .min(1, { message: t('auth.validation.passwordRequired') }),
      agreePolicy: z.boolean(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('auth.validation.passwordMismatch'),
      path: ['confirmPassword'],
    })
    .refine((data) => data.agreePolicy, {
      message: t('auth.validation.agreeRequired'),
      path: ['agreePolicy'],
    });

/** checkPasswordStrength（password-strength.vue:27-46 的 1:1 port） */
function checkPasswordStrength(password: string): number {
  let strength = 0;

  // Check length
  if (password.length >= 8) strength++;

  // Check for lowercase letters
  if (/[a-z]/.test(password)) strength++;

  // Check for uppercase letters
  if (/[A-Z]/.test(password)) strength++;

  // Check for numbers
  if (/\d/.test(password)) strength++;

  // Check for special characters
  if (/[^\da-z]/i.test(password)) strength++;
  return strength;
}

const STRENGTH_LIST = [
  '',
  '#e74242',
  '#ED6F6F',
  '#EFBD47',
  '#55D18780',
  '#55D187',
];

/** PasswordStrength — password-strength.vue 的 1:1 port */
function PasswordStrength({ password = '' }: { password?: string }) {
  const currentStrength = checkPasswordStrength(password);
  const currentColor = STRENGTH_LIST[currentStrength];

  return (
    <div className="relative mt-2 flex items-center justify-between">
      {[1, 2, 3, 4, 5].map((index) => (
        <div
          key={index}
          className="bg-heavy dark:bg-input-background relative mr-1 h-1.5 w-1/5 rounded-sm last:mr-0"
        >
          <span
            style={{
              backgroundColor: currentColor,
              width: currentStrength >= index ? '100%' : undefined,
            }}
            className="absolute left-0 h-full w-0 rounded-sm transition-all duration-500"
          />
        </div>
      ))}
    </div>
  );
}

interface RegisterFormProps {
  loading?: boolean;
  loginPath?: string;
  title?: string;
  subTitle?: string;
  submitButtonText?: string;
  onSubmit?: (values: {
    agreePolicy: boolean;
    confirmPassword: string;
    password: string;
    username: string;
  }) => void;
  slotTitle?: ReactNode;
  slotSubTitle?: ReactNode;
  slotSubmitButtonText?: ReactNode;
}

export function RegisterForm({
  loading = false,
  loginPath = '/auth/login',
  title = '',
  subTitle = '',
  submitButtonText = '',
  onSubmit,
  slotTitle,
  slotSubTitle,
  slotSubmitButtonText,
}: RegisterFormProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [values, setValues] = useState({
    agreePolicy: false,
    confirmPassword: '',
    password: '',
    username: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function setField(field: keyof typeof values, value: string | boolean) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  // dependencies.triggerFields: ['password']（register.vue:47-62 等价）：
  // password 变化时重跑 confirmPassword 的依赖规则（仅在已存在错误时
  // 重校验，等价参考实现 表单引擎的 trigger 重校验语义）
  useEffect(() => {
    if (!errors.confirmPassword) return;
    const ok =
      values.confirmPassword.length >= 1 &&
      values.confirmPassword === values.password;
    setErrors((prev) => (ok ? { ...prev, confirmPassword: '' } : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.password]);

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const parsed = buildRegisterSchema(t).safeParse(values);
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
    // @keydown.enter.prevent（register.vue:100）—— 显式 preventDefault
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
            {slotSubTitle ?? (subTitle || t('auth.register.subTitle'))}
          </span>
        }
      >
        {slotTitle ?? (title || t('auth.register.title'))}
      </AuthTitle>

      <div>
        <input
          type="text"
          className="input input-bordered w-full"
          placeholder={t('auth.validation.usernameRequired')}
          value={values.username}
          aria-invalid={!!errors.username}
          onChange={(e) => setField('username', e.target.value)}
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
          value={values.password}
          aria-invalid={!!errors.password}
          onChange={(e) => setField('password', e.target.value)}
        />
        {errors.password ? (
          <p className="text-destructive mt-1 text-xs">{errors.password}</p>
        ) : null}
        {/* passwordStrength: true（上游密码输入组件）等价 */}
        <PasswordStrength password={values.password} />
        <p className="text-muted-foreground mt-1.5 text-xs">
          {t('auth.register.passwordHint')}
        </p>
      </div>

      <div>
        <input
          type="password"
          className="input input-bordered w-full"
          placeholder={t('auth.register.confirmPasswordPlaceholder')}
          value={values.confirmPassword}
          aria-invalid={!!errors.confirmPassword}
          onChange={(e) => setField('confirmPassword', e.target.value)}
        />
        {errors.confirmPassword ? (
          <p className="text-destructive mt-1 text-xs">
            {errors.confirmPassword}
          </p>
        ) : null}
      </div>

      {/* agreePolicy（reference app register.vue：勾选后提交才有效） */}
      <div>
        <label className="label cursor-pointer justify-start gap-2 text-sm font-normal">
          <input
            type="checkbox"
            className="checkbox checkbox-sm checkbox-primary"
            checked={values.agreePolicy}
            aria-invalid={!!errors.agreePolicy}
            onChange={(e) => setField('agreePolicy', e.target.checked)}
          />
          {t('auth.register.agree')}
          <a
            href="#"
            className="auth-link ml-1"
            onClick={(e) => e.preventDefault()}
          >
            {t('auth.register.agreement')}
          </a>
        </label>
        {errors.agreePolicy ? (
          <p className="text-destructive mt-1 text-xs">{errors.agreePolicy}</p>
        ) : null}
      </div>

      <button
        type="submit"
        aria-label="register"
        className={`btn btn-primary mt-2 w-full ${loading ? 'cursor-wait' : ''}`}
        disabled={loading}
        onClick={(e) => handleSubmit(e)}
      >
        {loading ? (
          <span className="loading loading-spinner loading-xs" />
        ) : null}
        {slotSubmitButtonText ??
          (submitButtonText || t('auth.register.submit'))}
      </button>

      <div className="mt-4 text-center text-sm">
        {t('auth.register.hasAccount')}
        <span
          role="button"
          tabIndex={0}
          className="auth-link text-sm font-normal"
          onClick={() => navigate(loginPath)}
          onKeyDown={(e) => e.key === 'Enter' && navigate(loginPath)}
        >
          {t('auth.register.goLogin')}
        </span>
      </div>
    </form>
  );
}

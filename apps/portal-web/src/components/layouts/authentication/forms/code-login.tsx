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

/**
 * AuthenticationCodeLogin — 1:1 port of common-ui/ui/authentication/code-login.vue.
 * 上游 schema 表单引擎 → 受控 input + zod（等价参考实现 playground code-login.vue 的
 * rules：phoneNumber min(1) + /^\d{11}$/ refine（"请输入手机号" /
 * "手机号码格式错误"，mobileTip/mobileErrortip），code length(6)
 * （codeTip "请输入{0}位验证码"））。
 *
 * 上游 PinInput 组件（codeLength=6 + 发送验证码按钮）→ 受控 input + 独立按钮；
 * 倒计时为 上游 PinInput 组件 语义的等价实现（maxTime 60s，每秒递减，期间
 * 按钮禁用并显示 "{0}秒后重新获取"）；handleSendCode 等价 playground
 * 的实现：先校验手机号，通过后模拟 3s 发送（reference 的 antd
 * message.loading/success 提示依赖应用层消息基础设施，port demo 无
 * 该设施 —— 差异在此文档化）。
 */
const CODE_LENGTH = 6;
const MAX_TIME = 60;

/** 校验文案走语言包（提交/发送时按当前语言构建） */
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

  // 发送验证码（playground code-login.vue:49-63 等价：校验手机号 → 3s 模拟）
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // startCountdown（pin-input input.vue:73-80 等价：countdown > 0 时每秒递减）
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

  /** handleSendCode：先校验手机号，通过后模拟 3s 发送并启动倒计时 */
  async function handleSendCode() {
    const phone = values.phoneNumber;
    const phoneValid = phone.length >= 1 && /^\d{11}$/.test(phone);
    if (!phoneValid) {
      // validateField('phoneNumber') 失败 → 抛错不启动倒计时
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

    // sendCodeApi：3s 模拟发送（message 提示为应用层设施，port 未含）
    await new Promise((resolve) => setTimeout(resolve, 3000));
    setSending(false);
    setCountdown(MAX_TIME);
  }

  /** handleSend（pin-input input.vue:58-70 等价） */
  function handleSend(e: React.MouseEvent) {
    e.preventDefault();
    if (sending || countdown > 0) return;
    void handleSendCode();
  }

  // createText：倒计时 > 0 时 "{0}秒后重新获取"，否则 "获取验证码"
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
    // @keydown.enter.prevent（code-login.vue:81）—— 显式 preventDefault
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

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { z } from 'zod';

import { AuthTitle } from './auth-title';
import { ThirdPartyLogin } from './third-party-login';

/**
 * AuthenticationLogin — 1:1 port of common-ui/ui/authentication/login.vue.
 *
 * 上游 schema 表单引擎（schema 驱动表单引擎）的 React 等价：受控 input + zod
 * validation（登录页 schema 由本组件内置 —— reference 的 formSchema prop
 * 由 app 层传入，port 的 demo 无独立 app 层表单配置面，内置等价 schema：
 * username z.string().min(1) / password z.string().min(1)，即 reference
 * login.vue 中 username/password 两项的 rules）。上游按钮组件/上游复选框 →
 * daisyUI btn/checkbox；VebarForm 的错误提示置于字段下方。
 *
 * 有意未移植（playground login.vue 的 app 层扩展）：selectAccount 快速
 * 选择账号（authStore mock 账号列表）与 SliderCaptcha 滑块验证 —— 二者
 * 为 playground 演示页附加能力，依赖 authStore/验证码组件，port demo
 * 无对应后端会话概念。
 */

/** 等价参考实现 app login.vue 的 username/password rules（校验文案走语言包，提交时按当前语言构建） */
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
  /** 等价参考实现 路径默认值 —— port 路由同样按 /auth/* 组织 */
  codeLoginPath?: string;
  forgetPasswordPath?: string;

  /** 登录处理 loading（等价 :loading —— cursor-wait + spinner） */
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

  /** 表单校验通过的提交回调（等价 emit('submit', values)） */
  onSubmit?: (values: LoginFormValues) => void;

  /** #title slot 覆盖 */
  slotTitle?: ReactNode;

  /** #subTitle slot 覆盖 */
  slotSubTitle?: ReactNode;

  /** #third-party-login slot 覆盖 */
  slotThirdPartyLogin?: ReactNode;

  /** #to-register slot 覆盖 */
  slotToRegister?: ReactNode;
}

/** 等价 REMEMBER_ME_USERNAME_${location.hostname}（login.vue:61） */
const REMEMBER_ME_KEY = `REMEMBER_ME_USERNAME_${location.hostname}`;

/** 记住密码（与用户名同生命周期：勾选记住我时写入，取消时清空） */
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

  // onMounted：恢复记住的用户名和密码（login.vue:83-87 扩展）
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

      // 记住用户名和密码（勾选时写入，否则清空）
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
    // @keydown.enter.prevent="handleSubmit"（login.vue:95）—— 显式 preventDefault
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
              className="auth-link text-sm font-normal"
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

      {/* 第三方登录 */}
      {slotThirdPartyLogin ??
        (showThirdPartyLogin ? <ThirdPartyLogin /> : null)}

      {slotToRegister ??
        (showRegister ? (
          <div className="mt-3 text-center text-sm">
            {t('auth.login.noAccount')}
            <span
              role="button"
              tabIndex={0}
              className="auth-link text-sm font-normal"
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

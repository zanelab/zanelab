import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Logo } from '@zanelab/ui';
import { authApi } from '../api/auth';
import { getProps } from '../main';
import { onLoginSuccess as emitLoginSuccess } from '../utils/http';
import { OtpVerifyModal } from './OtpVerifyModal';

/*
 * 登录页 — 云 Supabase email + OTP 两步流（R1/R2/R3/R3b/R4）。
 *
 * 语言：全部文案经 i18n t()（文案模块 apps/iam-web/src/locales，两语言包
 * zh-CN/en-US）；语言来源 = 基座下发的 props（preferences.locale + 运行期
 * onHostStateChange 推送，接线见 main.tsx setupLocale），子应用不持本地偏好。
 *
 * 接口契约（路径、请求/响应类型、双态解包、成功判定、错误语义）全部收敛在
 * src/api/auth.ts（路径常量 src/api/endpoints.ts）；本页只调 authApi 拿领域对象，
 * 只保留错误展示位置与 i18n 兜底文案两件事。
 * - 步骤 1 发码：authApi.sendOtp(email) → POST {prefix}{OTP_SEND_PATH}
 *   出参 envelope { code:0, data:{ success:true }, msg }（对齐 legacy /sys/auth/otp 先例）
 * - 步骤 2 验码：authApi.verifyOtp(email, code) → POST {prefix}{OTP_VERIFY_PATH}
 *   出参 envelope { code:0, data:{ token, refreshToken, user:{ id, username, email } }, msg }
 *   （data 形状沿用 M1 出参契约；envelope 解包在 api 层兼容，页面不见形态差异）
 *   路径常量即 Edge Fn 路径（含函数名段 iam）；集成态前缀 = '/iam'
 *   （走宿主配置代理），独立态 = ''（前缀派生见 src/api/auth.ts，常量见 src/api/endpoints.ts）
 * - M1 stash 只有 password 登录路由（grep otp/verifyOtp 为空），以上两路由是
 *   本任务新定契约；Edge Fn 侧实现随 M1 恢复任务落地
 * - 云 curl 验证 blocked：云项目 ref 未提供；请求失败时错误提示区正常展示（不静默降级）
 * - 无密码框：OTP 原生 password-free，设计提示词的密码补齐点取消；无 base64
 *   btoa（那是 legacy 密码端点需要）、无 supabase-js（认证全经 Edge Fn）
 *
 * preferences 消费优先级：props.preferences 字段优先 → 内置中性缺省兜底
 * （mode 缺省 light）。应用方式 = 页面根 div 内联 CSS 变量 + Tailwind 任意值
 * 类消费，不改宿主 daisyUI 主题；mode==='dark' 时本页自持 data-theme 派生
 * （宿主注入的 daisyUI/Tailwind 样式照常生效）。
 */

const RESEND_SECONDS = 60;

// iam 自定义登录页（public 路由，未登录可访问）。
// http 经兼容封装（src/utils/http.ts）：集成态透传宿主 props.http（拦截器承担
// 解包/token 头/notify），独立运行（其他团队只跑本应用 dev server 测试）时
// props.http 不存在 → 本地兜底 RequestClient + envelope 解包，业务层零感知。
// 登录成功经兼容封装 emitLoginSuccess 把会话交还宿主（bootstrapSession + 跳转），
// 独立态本地持会话 + 跳首页。
//
// API 寻址（调子应用接口经配置代理，宿主不代持有 mock/路由）：
// - 前缀 + 路径常量在 api 层单点（src/api/endpoints.ts、src/api/auth.ts）：
//   集成态请求带 /iam 代理前缀 → 宿主 vite proxy 剥前缀转发到本 dev server
//   → 本应用 worker（mock）或 Edge Fn（真实）拦截
// - 独立态：props.basename 缺省 → 无前缀，请求直落本 dev server
// 前缀从 props.basename（= activeRule）派生，与路由 basename 同源，不另设配置。
export function LoginPage() {
  const props = getProps();
  // i18n：文案键见 locales/zh-CN.json iam.*；语言切换由基座 props 驱动
  // （main.tsx setupLocale 接线），useTranslation 订阅后自动重渲染
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false); // 发码 loading（独立于验码 loading）
  const [verifying, setVerifying] = useState(false); // 验码 loading（弹窗内）
  const [countdown, setCountdown] = useState(0); // 60s 发码倒计时（登录页/弹窗共享）
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState(''); // 发码错误（登录页展示）
  const [verifyError, setVerifyError] = useState(''); // 验码错误（弹窗内展示）
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 60s 发码倒计时：前端本地 setInterval，unmount/归零后清理
  useEffect(() => {
    if (countdown <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setInterval(() => {
      setCountdown((n) => n - 1);
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [countdown > 0]);

  // 错误文案：api 层已把后端 msg 归一化进 Error.message（取不到则无 message），
  // 取不到时落 i18n 兜底——展示位置（登录页 inline / 弹窗内）由此处决定
  const errText = (e: unknown, fallback: string) =>
    e instanceof Error && e.message ? e.message : fallback;

  const sendCode = async (resend: boolean) => {
    if (!email.trim() || countdown > 0) return;
    if (resend) {
      setVerifyError('');
    } else {
      setError('');
    }
    setSending(true);
    try {
      // 发码契约（路径/成功判定/错误语义）全在 src/api/auth.ts，本页只展示结果；
      // 路径寻址见文件头「API 寻址」注释（集成态经 /iam 前缀走宿主代理）
      await authApi.sendOtp(email.trim());
      setCountdown(RESEND_SECONDS);
      setVerifyError('');
      setModalOpen(true);
    } catch (e) {
      const msg = errText(e, t('iam.login.sendFailed'));
      if (resend) setVerifyError(msg);
      else setError(msg);
    } finally {
      setSending(false);
    }
  };

  const verify = async (code: string) => {
    setVerifying(true);
    setVerifyError('');
    try {
      // 成功即拿领域对象 LoginSession（token 非空判定与双形态取数在 api 层完成）
      const session = await authApi.verifyOtp(email.trim(), code);
      setModalOpen(false);
      // 兼容封装：集成态交还宿主 onLoginSuccess（bootstrapSession + 跳转），
      // 独立态本地持会话 + 跳首页（emitLoginSuccess 内部已 pushState 交还
      // 路由控制权，无需子应用再跳转）
      await emitLoginSuccess({
        token: session.token,
        refreshToken: session.refreshToken,
        user: session.user,
      });
    } catch (e) {
      setVerifyError(errText(e, t('iam.otp.verifyFailed')));
    } finally {
      setVerifying(false);
    }
  };

  // R4 返回首页：/home 在子应用 basename 之外，pushState + popstate 交还宿主路由
  // （与 portal redirectToLogin 的整页跳转对称，不用子应用 router navigate）
  const goHome = () => {
    window.history.pushState({}, '', '/home');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // R2 preferences：props.preferences 存在则字段优先，否则内置中性缺省
  const prefs = {
    mode: 'light' as const,
    colorPrimary: 'hsl(221 83% 53%)',
    colorDestructive: 'hsl(0 84% 60%)',
    colorSuccess: 'hsl(142 71% 45%)',
    colorWarning: 'hsl(38 92% 50%)',
    radius: '0.625', // rem 数值字符串（与宿主 SubAppPreferences 契约一致，如 '0.5'）
    fontSize: 16,
    colorGrayMode: false,
    colorWeakMode: false,
    locale: 'zh-CN',
    ...props.preferences,
  };
  const dark = prefs.mode === 'dark';

  return (
    // 页面根 div 内联 CSS 变量（R2），元素类用 Tailwind 任意值消费；
    // mode==='dark' → 本页自持 data-theme 派生（样式来源仍是宿主注入的 daisyUI/Tailwind）
    <div
      data-theme={dark ? 'dark' : undefined}
      style={
        {
          '--page-primary': prefs.colorPrimary,
          // radius 是纯 rem 数值字符串（契约同宿主），此处补 rem 单位
          '--page-radius': `${prefs.radius}rem`,
          '--page-font': `${prefs.fontSize}px`,
        } as CSSProperties
      }
      className="bg-base-100 flex min-h-screen items-center justify-center"
    >
      {/* 返回首页链接绝对定位于页面左上角（不随 max-w-md 容器居中滚动） */}
      <button
        type="button"
        onClick={goHome}
        className="text-base-content/60 hover:text-base-content absolute top-5 left-5 z-10 inline-flex items-center gap-1 text-sm no-underline"
      >
        <svg
          className="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        {t('iam.login.backHome')}
      </button>

      <div
        className="w-full max-w-md px-6"
        style={{ fontSize: 'var(--page-font)' }}
      >
        {/* 主体：Logo（ui 库 Logo 组件，1:1 同宿主头部）+ 标题 + 副标题 */}
        <div className="flex flex-col items-center">
          {/* slotText 展示纯图标形态（img 无 src 时不渲染图片，只留文本——
              这里传空串让组件渲染图标空位，与宿主 logo.svg 图形态对齐） */}
          <Logo
            src="/logo.svg"
            text=""
            logoSize={40}
            fit="contain"
            theme={dark ? 'dark' : 'light'}
            className="pointer-events-none"
          />
          <h1 className="text-base-content mt-6 text-3xl font-semibold">
            {t('iam.login.title')}
          </h1>
          <p className="text-base-content/60 mt-2 text-sm">
            {t('iam.login.subTitle')}
          </p>
        </div>

        {/* 社交登录按钮区：GoTrue OAuth 需云控制台配置 provider，本任务 UI 先行 disabled 占位。
            btn-outline 变体：宿主全局覆盖 .btn:not(.btn-outline) border-width:0（portal
            index.css 去边框基线），非 outline 按钮的 border utility 在集成态会被剥——
            描边按钮必须走 btn-outline（宿主经 --btn-border 定制描边色），两态视觉一致 */}
        <div className="mt-10 flex flex-col gap-3">
          <div className="tooltip w-full" data-tip={t('iam.login.comingSoon')}>
            <button
              type="button"
              disabled
              className="btn btn-outline border-base-content/20 bg-base-100 text-base-content hover:border-base-content/35 hover:bg-base-content/10 w-full gap-3 rounded-full"
            >
              <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
                {/* 品牌色固定不随主题（与 portal forms/icons/brand.tsx 同款 path） */}
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
                />
              </svg>
              {t('iam.login.google')}
            </button>
          </div>
          <div className="tooltip w-full" data-tip={t('iam.login.comingSoon')}>
            <button
              type="button"
              disabled
              className="btn btn-outline border-base-content/20 bg-base-100 text-base-content hover:border-base-content/35 hover:bg-base-content/10 w-full gap-3 rounded-full"
            >
              {/* GitHub Logo 品牌色固定 #181717，不随主题 */}
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="#181717"
                aria-hidden="true"
              >
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22v3.293c0 .32.19.695.8.57C20.565 21.796 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              {t('iam.login.github')}
            </button>
          </div>
        </div>

        <div className="divider text-base-content/40 mt-8 text-xs">
          {t('iam.login.divider')}
        </div>

        {/* OTP 步骤 1：邮箱输入 + 获取验证码 */}
        <div className="mt-2 flex flex-col gap-4">
          <input
            type="email"
            placeholder={t('iam.login.emailPlaceholder')}
            className="input border-base-content/25 bg-base-100 hover:border-base-content/40 w-full rounded-full border focus:border-(--page-primary) focus:ring-2 focus:ring-(--page-primary)/30"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void sendCode(false);
            }}
          />
          <button
            type="button"
            className="btn disabled:bg-base-300 disabled:text-base-content/50 w-full gap-3 rounded-full bg-(--page-primary) text-white hover:opacity-90"
            disabled={sending || countdown > 0 || !email.trim()}
            onClick={() => void sendCode(false)}
          >
            {sending && <span className="loading loading-spinner loading-sm" />}
            {countdown > 0
              ? t('iam.login.resendIn', { n: countdown })
              : t('iam.login.getCode')}
          </button>

          {/* 发码错误提示区（不静默降级：云 ref 未配时请求失败在此展示） */}
          {error && (
            <div
              role="alert"
              className="alert alert-error rounded-(--page-radius) text-sm"
            >
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* R3b 验证弹窗：渲染在根 div 内（内联 CSS 变量继承），不 createPortal */}
      <OtpVerifyModal
        open={modalOpen}
        email={email.trim()}
        countdown={countdown}
        verifying={verifying}
        error={verifyError}
        onClose={() => setModalOpen(false)}
        onVerify={(code) => void verify(code)}
        onResend={() => void sendCode(true)}
      />
    </div>
  );
}

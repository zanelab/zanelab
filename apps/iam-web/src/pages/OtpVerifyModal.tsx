import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * OTP 验证弹窗（发码成功后的第二步验码，设计提示词 1:1）。
 *
 * - 语言与登录页同实例（useTranslation 订阅 iam.otp.* 文案，见 locales/i18n.ts
 *   ——基座 props 下发 locale，运行期 onHostStateChange 推送切换）
 * - daisyUI 5 `<dialog class="modal">` + `modal-open` 受控（React state 控制，
 *   不用 checkbox/anchor legacy 写法）；遮罩（form method=dialog modal-backdrop）
 *   与右上 X 都触发 onClose
 * - 不 createPortal 到 body：弹窗渲染在 LoginPage 根 div 内，内联 preferences
 *   CSS 变量就近继承；qiankun experimentalStyleIsolation 下容器外样式不可靠
 * - OTP 输入用 daisyUI 5 otp 组件：单 input（maxLength=6）+ 6 个 span 展示格，
 *   跳格/退格/粘贴分发行为由组件自带，不手写 6 input 逻辑；样式微调（h-12 /
 *   rounded）用 Tailwind 任意值覆盖
 * - 重发的 disabled/倒计时与 LoginPage 共享同一 countdown props（>0 时 disabled
 *   + 文案「{n}s 后可重发」），onResend 回调触发 LoginPage 重发
 * - 验码成功/请求都由 LoginPage 处理（onVerify 只回传 code）；验码失败错误提示
 *   区在弹窗内（props.error 传入），不清码不打断
 */
interface OtpVerifyModalProps {
  open: boolean;
  /** 步骤 1 输入的邮箱（副标题动态加粗展示） */
  email: string;
  /** 发码 60s 倒计时（与登录页共享同一状态） */
  countdown: number;
  /** 验码请求进行中（按钮 spinner） */
  verifying: boolean;
  /** 验码失败错误提示（弹窗内展示） */
  error: string;
  onClose: () => void;
  /** code 输满 6 位后点「验证」回调（otp/verify 请求在 LoginPage 发起） */
  onVerify: (code: string) => void;
  onResend: () => void;
}

export function OtpVerifyModal({
  open,
  email,
  countdown,
  verifying,
  error,
  onClose,
  onVerify,
  onResend,
}: OtpVerifyModalProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const full = code.length === 6;

  // 每次打开清空上次输入（失败重试从干净状态开始）
  useEffect(() => {
    if (open) setCode('');
  }, [open]);

  return (
    // 遮罩 blur：daisyUI 5 的 .modal 遮罩只有半透明底色（oklch(0 0 0/.4)），无
    // backdrop-filter——设计提示词要求深色半透明 + backdrop-blur，在此补挂
    // backdrop-blur-xs（宿主 Tailwind 按使用生成 utility，portal 源码已在用该档，
    // 产物 CSS 确认存在 .backdrop-blur-xs；作用于 .modal 自身身后的登录页内容）
    <dialog className={`modal backdrop-blur-xs ${open ? 'modal-open' : ''}`}>
      <div className="modal-box bg-base-100 max-w-[480px] rounded-3xl p-8 shadow-xl md:p-10">
        {/* 右上角关闭 */}
        <button
          type="button"
          aria-label={t('iam.otp.close')}
          className="btn btn-circle btn-ghost btn-sm text-base-content/60 absolute top-4 right-4"
          onClick={onClose}
        >
          <svg
            className="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        {/* 顶部信封图标 */}
        <div className="text-base-content/70 bg-base-200 mx-auto flex size-16 items-center justify-center rounded-full">
          <svg
            className="size-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
        </div>

        {/* 标题 / 副标题（邮箱动态加粗——文案拆 prefix/suffix 两段夹 <b>email</b>，
            i18next 插值返回纯文本无法保留加粗语义；en 的 suffix 为空串） */}
        <h3 className="text-base-content mt-6 text-center text-3xl font-semibold">
          {t('iam.otp.title')}
        </h3>
        <p className="text-base-content/60 mt-2 text-center text-sm">
          {t('iam.otp.sentToPrefix')}
          <b>{email}</b>
          {t('iam.otp.sentToSuffix')}
        </p>

        {/* 6 格 OTP 输入（daisyUI otp 组件自带跳格/退格/粘贴分发） */}
        <div className="mt-8 flex justify-center">
          {/* span 必须在 input 之前：daisyUI otp 用 nth-child 定位格子，
              input 放前面会把所有格子序号后移一位（整体错位 + 末尾多一个空框） */}
          <label className="otp otp-lg mx-auto [&>span]:h-12 [&>span]:rounded-lg">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <input
              type="text"
              maxLength={6}
              inputMode="numeric"
              pattern="\d{6}"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
              }
            />
          </label>
        </div>
        <p className="text-base-content/50 mt-3 text-center text-xs">
          {t('iam.otp.hint')}
        </p>

        {/* 验码失败错误提示（弹窗内，不清码不打断） */}
        {error && (
          <div
            role="alert"
            className="alert alert-error mt-4 rounded-(--page-radius) text-sm"
          >
            <span>{error}</span>
          </div>
        )}

        {/* 验证按钮：code 不足 6 位 disabled（浅灰底） */}
        <button
          type="button"
          className="btn disabled:bg-base-300 disabled:text-base-content/50 mt-6 w-full rounded-xl bg-(--page-primary) text-white hover:opacity-90"
          disabled={!full || verifying}
          onClick={() => onVerify(code)}
        >
          {verifying && <span className="loading loading-spinner loading-sm" />}
          {/* 设计提示词文案「验证码」按「验证」实现：按钮语义为提交动作，文案疑为笔误 */}
          {t('iam.otp.verify')}
        </button>

        {/* 重发：倒计时与登录页共享，>0 时 disabled */}
        <p className="text-base-content/60 mt-4 text-center text-sm">
          {t('iam.otp.noCode')}
          <button
            type="button"
            className="link underline disabled:opacity-50"
            disabled={countdown > 0 || verifying}
            onClick={onResend}
          >
            {countdown > 0
              ? t('iam.login.resendIn', { n: countdown })
              : t('iam.otp.resend')}
          </button>
        </p>

        {/* Info Box */}
        <div className="border-base-300 bg-base-200 mt-6 flex gap-3 rounded-(--page-radius) border p-4">
          <svg
            className="text-base-content/60 size-5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8h.01M11 12h1v5h1" />
          </svg>
          <div>
            <p className="text-base-content text-sm font-semibold">
              {t('iam.otp.infoTitle')}
            </p>
            <p className="text-base-content/60 mt-1 text-xs">
              {t('iam.otp.infoBody')}
            </p>
          </div>
        </div>
      </div>

      {/* 点击遮罩关闭（daisyUI modal-backdrop 标准结构） */}
      <form
        method="dialog"
        className="modal-backdrop"
        onSubmit={(e) => {
          e.preventDefault();
          onClose();
        }}
      >
        {/* 遮罩按钮不可见（daisyUI .modal-backdrop 全屏透明层），aria-label 取文案键 */}
        <button aria-label={t('iam.otp.close')}>close</button>
      </form>
    </dialog>
  );
}

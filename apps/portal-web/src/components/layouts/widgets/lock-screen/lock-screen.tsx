import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../../../icons/app-icon';

interface LockScreenProps {
  /** 头像 */
  avatar?: string;

  /** 锁屏密码（等价于 accessStore.lockScreenPassword） */
  password?: string;

  /** 返回登录 */
  onToLogin?: () => void;

  /** 解锁成功 */
  onUnlock?: () => void;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/**
 * LockScreen — 1:1 port of widgets/lock-screen/lock-screen.vue.
 * Clock face + keyhole unlock form; validates against the lock-screen password.
 */
export function LockScreen({
  avatar = '',
  password = '',
  onToLogin,
  onUnlock,
}: LockScreenProps) {
  const { t, i18n } = useTranslation();
  const [now, setNow] = useState(() => new Date());
  const [showUnlockForm, setShowUnlockForm] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 实时时钟
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // 锁定时禁止页面滚动（等价于 useScrollLock）
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const hour = pad(now.getHours());
  const minute = pad(now.getMinutes());
  const meridiem = now.getHours() >= 12 ? 'PM' : 'AM';
  const date = now.toLocaleDateString(i18n.language, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
  });

  function toggleUnlockForm() {
    setShowUnlockForm((v) => !v);
    setError(false);
    if (!showUnlockForm) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function handleSubmit() {
    if (!inputPassword) {
      setError(true);
      return;
    }
    if (inputPassword === password) {
      onUnlock?.();
    } else {
      setError(true);
    }
  }

  return (
    <div className="bg-base-100 fixed z-2000 size-full">
      <div className={`size-full ${showUnlockForm ? 'hidden' : ''}`}>
        <div
          className="group text-foreground/80 hover:text-foreground fixed top-6 left-1/2 z-2001 flex cursor-pointer flex-col items-center text-xl font-semibold"
          style={{ transform: 'translateX(-50%)' }}
          onClick={toggleUnlockForm}
        >
          <AppIcon
            name="lock"
            className="size-5 transition-all duration-300 group-hover:scale-125"
          />
          <span>{t('widgets.lockScreen.clickToUnlock')}</span>
        </div>
        <div className="flex-center size-full">
          <div className="flex w-full justify-center gap-4 px-4 sm:gap-6 md:gap-8">
            <div className="flex-center bg-base-200 relative h-35 w-35 rounded-xl text-[36px] font-semibold sm:h-40 sm:w-40 sm:text-[42px] md:h-50 md:w-50 md:text-[72px]">
              <span className="absolute top-3 left-3 text-xs font-semibold sm:text-sm md:text-xl">
                {meridiem}
              </span>
              {hour}
            </div>
            <div className="flex-center bg-base-200 h-35 w-35 rounded-xl text-[36px] font-semibold sm:h-40 sm:w-40 sm:text-[42px] md:h-50 md:w-50 md:text-[72px]">
              {minute}
            </div>
          </div>
        </div>
      </div>

      {/* 解锁表单 */}
      {showUnlockForm ? (
        <div
          className="flex-center size-full"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSubmit();
            }
          }}
        >
          <div className="mb-10 flex w-[90%] max-w-75 flex-col items-center px-4">
            {/* enter-x（reference lock-screen.vue:132-152 交错入场动画 ——
             * avatar / 输入框容器 / 三个按钮各带 enter-x，index.css 的
             * nth-child 交错规则作用于它们；底部时间块带 enter-x/enter-y） */}
            <div className="enter-x mb-6 size-20">
              {avatar ? (
                <img
                  src={avatar}
                  className="size-20 rounded-full object-cover"
                  alt="avatar"
                />
              ) : (
                <div className="flex-center bg-primary/15 text-primary size-20 rounded-full">
                  <AppIcon name="user" className="size-8" />
                </div>
              )}
            </div>
            <div className="enter-x mb-2 w-full">
              <input
                ref={inputRef}
                type="password"
                name="password"
                className={[
                  'input input-bordered w-full',
                  error ? 'input-error' : '',
                ].join(' ')}
                placeholder={t('widgets.lockScreen.passwordPlaceholder')}
                value={inputPassword}
                onChange={(e) => {
                  setInputPassword(e.target.value);
                  setError(false);
                }}
              />
              {error ? (
                <span className="text-error mt-1 block text-xs">
                  {t('widgets.lockScreen.passwordError')}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              className="btn btn-primary enter-x w-full"
              onClick={handleSubmit}
            >
              {t('widgets.lockScreen.enter')}
            </button>
            <button
              type="button"
              className="btn btn-ghost enter-x my-2 w-full"
              onClick={() => onToLogin?.()}
            >
              {t('widgets.lockScreen.backToLogin')}
            </button>
            <button
              type="button"
              className="btn btn-ghost enter-x mr-2 w-full"
              onClick={toggleUnlockForm}
            >
              {t('common.back')}
            </button>
          </div>
        </div>
      ) : null}

      <div className="enter-y absolute bottom-5 w-full text-center text-xl md:text-2xl xl:text-xl 2xl:text-3xl">
        {showUnlockForm ? (
          <div className="enter-x mb-2 text-2xl md:text-3xl">
            {hour}:{minute}
            <span className="text-base md:text-lg">{meridiem}</span>
          </div>
        ) : null}
        <div className="text-xl md:text-3xl">{date}</div>
      </div>
    </div>
  );
}

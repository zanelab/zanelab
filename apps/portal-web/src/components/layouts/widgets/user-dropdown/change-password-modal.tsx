import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { authApi } from '../../../../api/auth';
import {
  PASSWORD_CHAR_CLASSES,
  PASSWORD_POLICY,
  type PasswordCharClass,
  matchPasswordCharClasses,
  validatePasswordPolicy,
  notify,
} from '@zanelab/utils';
import { AppIcon } from '../../../icons/app-icon';

type PasswordFieldName = 'oldPassword' | 'newPassword' | 'confirmPassword';

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PasswordFieldProps {
  label: string;
  placeholder: string;

  /** 前缀图标（AppIcon 标识符） */
  icon: string;
  autoComplete: string;
  value: string;
  error?: string;

  /** 无错误时展示的浅色说明（如新密码策略） */
  hint?: ReactNode;

  /** 字段下方的附加内容（如新密码的字符类实时反馈） */
  extra?: ReactNode;
  visible: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  onToggleVisible: () => void;
  onChange: (value: string) => void;
}

/**
 * 密码输入行：daisyUI `.input` 本身是 inline-flex（含 gap/内边距），可直接内嵌
 * 「前缀图标 + 原生 input + 显隐按钮」，无需相对定位包裹——图标与输入框基线自动对齐。
 */
function PasswordField({
  label,
  placeholder,
  icon,
  autoComplete,
  value,
  error,
  hint,
  extra,
  visible,
  inputRef,
  onToggleVisible,
  onChange,
}: PasswordFieldProps) {
  const { t } = useTranslation();
  return (
    <div>
      <label className="text-base-content/70 mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <label
        className={`input w-full transition-colors ${
          // 报错时保持红框（不再叠加 primary 聚焦色，避免聚焦后错误态被覆盖）
          error ? 'input-error' : 'focus-within:border-primary'
        }`}
      >
        <AppIcon name={icon} className="size-4 shrink-0 opacity-40" />
        <input
          ref={inputRef}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          className="grow bg-transparent text-sm outline-none"
          placeholder={placeholder}
          value={value}
          aria-invalid={!!error}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-circle shrink-0 opacity-50 hover:opacity-100"
          // 不参与键盘 Tab 序：三个密码框已是主流导航顺序，显隐按钮只作鼠标辅助
          tabIndex={-1}
          aria-label={
            visible
              ? t('widgets.changePassword.hidePassword')
              : t('widgets.changePassword.showPassword')
          }
          // 阻止 mousedown 抢焦点，否则点显隐会把刚输入的输入框失焦
          onMouseDown={(e) => e.preventDefault()}
          onClick={onToggleVisible}
        >
          <AppIcon name={visible ? 'eye-off' : 'eye'} className="size-4" />
        </button>
      </label>
      {error ? (
        <p className="text-destructive mt-1.5 text-xs">{error}</p>
      ) : hint ? (
        <p className="text-base-content/45 mt-1.5 text-xs">{hint}</p>
      ) : null}
      {extra}
    </div>
  );
}

/**
 * 新密码策略实时反馈：4 个字符类标记（已达标的置成功态）+ 已覆盖类数。
 * 策略是「4 类里覆盖 3 类」，只给一条静态提示用户无法判断当前输入是否达标，
 * 故这里边输边反馈（纯展示，不参与校验；提交时仍由 validatePasswordPolicy 把关）。
 */
function PasswordPolicyHint({ password }: { password: string }) {
  const { t } = useTranslation();
  const matched = matchPasswordCharClasses(password);
  const satisfied = matched.length;
  const enough = satisfied >= PASSWORD_POLICY.requiredCharClasses;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {PASSWORD_CHAR_CLASSES.map((name: PasswordCharClass) => {
        const hit = matched.includes(name);
        return (
          <span
            key={name}
            className={`badge badge-sm gap-1 border-none ${
              hit
                ? 'bg-success/15 text-success'
                : 'bg-base-200/70 text-base-content/45'
            }`}
          >
            {hit ? <AppIcon name="check" className="size-3" /> : null}
            {t(`widgets.changePassword.charClasses.${name}`)}
          </span>
        );
      })}
      <span
        className={`ml-auto text-xs ${
          enough ? 'text-success' : 'text-base-content/45'
        }`}
      >
        {satisfied}/{PASSWORD_POLICY.requiredCharClasses}
      </span>
    </div>
  );
}

/**
 * ChangePasswordModal — 修改密码弹窗，迁移自旧项目
 * Micro-public/src/layouts/PaLayout/{PassWordForm.tsx, index.tsx 的 open 开关}。
 *
 * 差异说明（不影响业务口径）：
 * - 旧项目是 antd `ModalForm` + `ProFormText.Password`；新项目无 antd，改为 daisyUI
 *   `modal` + 受控 input + 手写校验（与 authentication/forms/register.tsx 同构）。
 * - 新密码校验改按后端 PasswordValidator 口径：长度 [8,32] + 4 类字符覆盖 ≥3 类
 *   （旧项目是 8-14 位且非纯数字/纯下划线/纯字母），常量见 @zanelab/utils 的 password-policy。
 * - 提交口径与旧项目一致：三个密码字段 `btoa` 后 PUT change/pwd（见 api/auth.ts）。
 *
 * 弹窗 portal 到 body：入口在下拉面板（AnchoredPortal，带 z-index/overflow 上下文）内，
 * 不 portal 会被裁剪或压在面板下面（同 lock-screen-modal 先例）。
 * 视觉沿用项目里 modal 的既有约定：左标题 + 右上关闭按钮（tenant-switcher）、
 * 底部右对齐操作区（timezone-button）。
 */
export function ChangePasswordModal({
  open,
  onOpenChange,
}: ChangePasswordModalProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 各字段明文/密文（默认全密文）
  const [visible, setVisible] = useState<Record<PasswordFieldName, boolean>>({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const oldInputRef = useRef<HTMLInputElement>(null);

  // 每次打开重置表单（等价旧项目 ModalForm 每次打开都是空表单），并聚焦原密码
  useEffect(() => {
    if (open) {
      setValues({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setErrors({});
      setVisible({
        oldPassword: false,
        newPassword: false,
        confirmPassword: false,
      });
      setSubmitting(false);
      requestAnimationFrame(() => oldInputRef.current?.focus());
    }
  }, [open]);

  function setField(field: PasswordFieldName, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  function toggleVisible(field: PasswordFieldName) {
    setVisible((v) => ({ ...v, [field]: !v[field] }));
  }

  async function handleSubmit() {
    const oldPassword = values.oldPassword.trim();
    const newPassword = values.newPassword.trim();
    const confirmPassword = values.confirmPassword.trim();

    // 校验顺序：必填 → 长度 → 字符类覆盖 → 新旧不同 → 两次一致
    const next: Record<string, string> = {};
    if (!oldPassword) next.oldPassword = t('widgets.changePassword.required');
    if (!newPassword) {
      next.newPassword = t('widgets.changePassword.required');
    } else {
      const issue = validatePasswordPolicy(newPassword);
      if (issue === 'length') {
        next.newPassword = t('widgets.changePassword.lengthError', {
          min: PASSWORD_POLICY.minLength,
          max: PASSWORD_POLICY.maxLength,
        });
      } else if (issue === 'charClasses') {
        next.newPassword = t('widgets.changePassword.charClassError', {
          required: PASSWORD_POLICY.requiredCharClasses,
        });
      } else if (newPassword === oldPassword) {
        next.newPassword = t('widgets.changePassword.sameAsOld');
      }
    }
    if (!confirmPassword) {
      next.confirmPassword = t('widgets.changePassword.required');
    } else if (confirmPassword !== newPassword) {
      next.confirmPassword = t('widgets.changePassword.mismatch');
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await authApi.changePassword({
        oldPassword: btoa(oldPassword),
        newPassword: btoa(newPassword),
        confirmPassword: btoa(confirmPassword),
      });
      notify.success(t('widgets.changePassword.success'));
      onOpenChange(false);
    } catch (error) {
      // 失败提示已由 http 拦截器统一 notify（spec/http-api-guidelines.md）；
      // 保持弹窗打开，用户可直接修正后重试。
      console.warn('[changePassword] failed:', error);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return createPortal(
    // zIndex 1100 > AnchoredPortal 面板的 1000（daisyUI .modal 默认 z-999）：
    // 本弹窗由下拉菜单项打开，此时下拉面板仍开着且 portal 到 body（z-1000），
    // 不提级的话面板会压在弹窗之上。面板会在下一次 pointerdown 时自动收起。
    <div
      className="modal modal-open modal-middle"
      style={{ zIndex: 1100 }}
      onClick={() => onOpenChange(false)}
    >
      <div className="modal-box max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* 头部：标题 + 副标题 + 关闭（对齐 tenant-switcher 的 modal 头部结构） */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base-content text-lg font-semibold">
              {t('widgets.changePassword.title')}
            </h3>
            <p className="text-base-content/50 mt-1 text-xs">
              {t('widgets.changePassword.subtitle')}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle -mt-1 -mr-1 shrink-0"
            aria-label={t('common.close')}
            onClick={() => onOpenChange(false)}
          >
            <AppIcon name="close" className="size-4" />
          </button>
        </div>

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <PasswordField
            label={t('widgets.changePassword.oldLabel')}
            placeholder={t('widgets.changePassword.oldPlaceholder')}
            icon="lock"
            autoComplete="current-password"
            value={values.oldPassword}
            error={errors.oldPassword}
            visible={visible.oldPassword}
            inputRef={oldInputRef}
            onToggleVisible={() => toggleVisible('oldPassword')}
            onChange={(value) => setField('oldPassword', value)}
          />

          <PasswordField
            label={t('widgets.changePassword.newLabel')}
            placeholder={t('widgets.changePassword.newPlaceholder')}
            icon="key"
            autoComplete="new-password"
            value={values.newPassword}
            error={errors.newPassword}
            hint={t('widgets.changePassword.newPasswordHint', {
              min: PASSWORD_POLICY.minLength,
              max: PASSWORD_POLICY.maxLength,
              required: PASSWORD_POLICY.requiredCharClasses,
            })}
            extra={<PasswordPolicyHint password={values.newPassword} />}
            visible={visible.newPassword}
            onToggleVisible={() => toggleVisible('newPassword')}
            onChange={(value) => setField('newPassword', value)}
          />

          <PasswordField
            label={t('widgets.changePassword.confirmLabel')}
            placeholder={t('widgets.changePassword.confirmPlaceholder')}
            icon="shield"
            autoComplete="new-password"
            value={values.confirmPassword}
            error={errors.confirmPassword}
            visible={visible.confirmPassword}
            onToggleVisible={() => toggleVisible('confirmPassword')}
            onChange={(value) => setField('confirmPassword', value)}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary min-w-24"
              disabled={submitting}
            >
              {submitting ? (
                <span className="loading loading-spinner loading-xs" />
              ) : null}
              {t('common.confirm')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

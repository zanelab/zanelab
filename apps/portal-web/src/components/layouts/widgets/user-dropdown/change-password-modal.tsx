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

  icon: string;
  autoComplete: string;
  value: string;
  error?: string;

  hint?: ReactNode;

  extra?: ReactNode;
  visible: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  onToggleVisible: () => void;
  onChange: (value: string) => void;
}

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

          tabIndex={-1}
          aria-label={
            visible
              ? t('widgets.changePassword.hidePassword')
              : t('widgets.changePassword.showPassword')
          }

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

  const [visible, setVisible] = useState<Record<PasswordFieldName, boolean>>({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const oldInputRef = useRef<HTMLInputElement>(null);

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
      console.warn('[changePassword] failed:', error);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div
      className="modal modal-open modal-middle"
      style={{ zIndex: 1100 }}
      onClick={() => onOpenChange(false)}
    >
      <div className="modal-box max-w-md" onClick={(e) => e.stopPropagation()}>
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

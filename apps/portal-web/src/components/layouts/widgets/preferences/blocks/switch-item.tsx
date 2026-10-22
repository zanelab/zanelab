import type { ReactNode } from 'react';
import { AppIcon } from '../../../../icons/app-icon';

interface SwitchItemProps {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  tip?: string;
  shortcut?: string;
  children: ReactNode;
}

export function SwitchItem({
  value,
  onChange,
  disabled = false,
  tip,
  shortcut,
  children,
}: SwitchItemProps) {
  return (
    <div
      className={`hover:bg-base-200 my-1 flex w-full items-center justify-between rounded-md px-2 py-2.5 ${disabled ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
      onClick={() => !disabled && onChange(!value)}
    >
      <span className="flex items-center text-sm">
        {children}
        {tip && (
          <span className="tooltip ml-1" data-tip={tip}>
            <AppIcon
              name="circle-help"
              className="text-base-content/50 size-3 cursor-help"
            />
          </span>
        )}
      </span>
      {shortcut && (
        <span className="mr-2 ml-auto text-xs opacity-60">{shortcut}</span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={value}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onChange(!value);
        }}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          value ? 'bg-primary' : 'bg-base-300'
        }`}
      >
        <span
          className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            value ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

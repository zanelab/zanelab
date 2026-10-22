import type { ReactNode } from 'react';
import { AppIcon } from '../../../../icons/app-icon';

interface InputItemProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  tip?: string;
  children: ReactNode;
}

export function InputItem({
  value,
  onChange,
  disabled = false,
  placeholder = '',
  tip,
  children,
}: InputItemProps) {
  return (
    <div
      className={`my-1 flex w-full items-center justify-between rounded-md px-2 py-1 ${!tip ? 'hover:bg-base-200' : ''} ${disabled ? 'pointer-events-none opacity-50' : ''}`}
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
      <div className="relative">
        <input
          type="text"
          className="input input-sm input-bordered h-8 w-[165px]"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button
            className="text-base-content/40 hover:text-base-content absolute top-1/2 right-2 -translate-y-1/2"
            onClick={() => onChange('')}
            tabIndex={-1}
          >
            <AppIcon name="circle-x" className="size-3" />
          </button>
        )}
      </div>
    </div>
  );
}

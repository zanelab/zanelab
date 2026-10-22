import type { ReactNode } from 'react';
import { AppIcon } from '../../../../icons/app-icon';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectItemProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  items?: SelectOption[];
  placeholder?: string;
  tip?: string;
  children: ReactNode;
}

export function SelectItem({
  value,
  onChange,
  disabled = false,
  items = [],
  placeholder = '',
  tip,
  children,
}: SelectItemProps) {
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
      <select
        className="select select-sm select-bordered h-8 w-[165px]"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}

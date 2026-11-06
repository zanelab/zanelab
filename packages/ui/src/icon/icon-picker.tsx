import { useEffect, useMemo, useRef, useState } from 'react';
import { AppIcon } from './app-icon';
import { BUILTIN_ICONS } from './builtin-icons';
import { useIconStore } from './icon-store';

/*
 * IconPicker —— 图标选择器（下拉展示所有可渲染图标供选择）。
 *
 * 数据源 = BUILTIN_ICONS（内置表）+ useIconStore 运行时注册表（iconPackUrl /
 * window.__registerIcons），运行时同键覆盖内置。每项渲染 AppIcon 预览 + 标识符。
 *
 * 受控用法：
 *   <IconPicker value={form.icon} onChange={(name) => setForm({ ...form, icon: name })} />
 * name = 选中标识符；null = 清空（allowEmpty 时才有「无」选项）。
 */

export interface IconPickerProps {
  /** 当前选中的图标标识符（空/未选 = null 或 undefined） */
  value?: string | null;
  /** 选中/清空回调（选中 → 标识符；清空 → null） */
  onChange?: (name: string | null) => void;
  /** 未选中时的占位文案 */
  placeholder?: string;
  /** 是否提供「无」选项以清空（默认 true） */
  allowEmpty?: boolean;
  /** 「无」选项的文案（默认「无」） */
  emptyLabel?: string;
  /** 外层附加 class */
  className?: string;
}

export function IconPicker({
  value,
  onChange,
  placeholder = '选择图标',
  allowEmpty = true,
  emptyLabel = '无',
  className,
}: IconPickerProps) {
  const runtimeIcons = useIconStore((s) => s.icons);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // 内置 + 运行时注册表合并（运行时同键覆盖内置），按标识符排序
  const iconNames = useMemo(() => {
    const merged = new Set([
      ...Object.keys(BUILTIN_ICONS),
      ...Object.keys(runtimeIcons),
    ]);
    return [...merged].sort((a, b) => a.localeCompare(b));
  }, [runtimeIcons]);

  // 点击面板外关闭
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const select = (name: string | null) => {
    onChange?.(name);
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className={`dropdown ${open ? 'dropdown-open' : ''} ${className ?? ''}`}
    >
      {/* 触发按钮：当前图标 + 标识符；未选显示占位 */}
      <button
        type="button"
        className="btn btn-sm gap-2"
        onClick={() => setOpen((v) => !v)}
      >
        {value ? (
          <>
            <AppIcon name={value} className="size-4" />
            <span className="font-mono text-xs">{value}</span>
          </>
        ) : (
          <span className="text-base-content/50">{placeholder}</span>
        )}
      </button>

      {/* 下拉列表：可滚动，项 = 图标预览 + 标识符 */}
      <ul
        className="dropdown-content menu menu-sm rounded-box bg-base-100 z-50 max-h-64 w-56 overflow-y-auto p-2 shadow"
        tabIndex={0}
      >
        {allowEmpty && (
          <li>
            <button type="button" onClick={() => select(null)}>
              <span className="text-base-content/50">{emptyLabel}</span>
            </button>
          </li>
        )}
        {iconNames.map((name) => (
          <li key={name}>
            <button
              type="button"
              className={value === name ? 'menu-active' : ''}
              onClick={() => select(name)}
            >
              <AppIcon name={name} className="size-4" />
              <span className="font-mono text-xs">{name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

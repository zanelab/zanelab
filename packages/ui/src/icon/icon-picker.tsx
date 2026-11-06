import { useMemo, useRef, useState } from 'react';
import { AppIcon } from './app-icon';
import { BUILTIN_ICONS } from './builtin-icons';
import { useIconStore } from './icon-store';

/*
 * IconPicker —— 图标选择器（Card as dropdown）。
 *
 * 触发按钮经 popover API 展开一个 card 面板：10×10 图标网格（每页 100），
 * 图标项只渲染图标（名字用 tooltip 展示）；超过一页用 Pagination 分页。
 *
 * 数据源 = BUILTIN_ICONS（内置表）+ useIconStore 运行时注册表（运行时同键覆盖
 * 内置）。受控用法：
 *   <IconPicker value={form.icon} onChange={(name) => setForm({ ...form, icon: name })} />
 * name = 选中标识符；null = 清空（allowEmpty 时面板头部有「无」按钮）。
 */

let uid = 0;

const PAGE_SIZE = 100; // 10 × 10

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
  const [page, setPage] = useState(1);

  // popover 唯一 id + 同名 CSS anchor（每个实例一个，稳定）
  const idRef = useRef<string | null>(null);
  if (idRef.current === null) idRef.current = `icon-picker-${++uid}`;
  const popoverId = idRef.current;
  const popoverRef = useRef<HTMLDivElement>(null);

  // 内置 + 运行时注册表合并（运行时同键覆盖内置），按标识符排序
  const iconNames = useMemo(() => {
    const merged = new Set([
      ...Object.keys(BUILTIN_ICONS),
      ...Object.keys(runtimeIcons),
    ]);
    return [...merged].sort((a, b) => a.localeCompare(b));
  }, [runtimeIcons]);

  const totalPages = Math.max(1, Math.ceil(iconNames.length / PAGE_SIZE));
  const pageIcons = iconNames.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // 打开面板时定位到当前选中值所在页（pack.json 图标多、按字母序排在后面，
  // 不定位的话选中值/已注册图标可能落在第 2+ 页，看起来像「没注册进来」）
  const locateToValue = () => {
    if (value) {
      const idx = iconNames.indexOf(value);
      if (idx >= 0) setPage(Math.floor(idx / PAGE_SIZE) + 1);
    } else {
      setPage(1);
    }
  };

  const select = (name: string | null) => {
    onChange?.(name);
    // 选中后收起面板（native popover 点面板内不会自动关闭）
    popoverRef.current?.hidePopover();
  };

  return (
    <div className={className}>
      {/* 触发按钮 */}
      <button
        type="button"
        className="btn btn-sm gap-2"
        popoverTarget={popoverId}
        style={{ anchorName: `--${popoverId}` }}
        onClick={locateToValue}
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

      {/* Card as dropdown（popover 面板） */}
      <div
        ref={popoverRef}
        id={popoverId}
        popover="auto"
        className="dropdown card card-border bg-base-100 w-80 p-3 shadow"
        style={{ positionAnchor: `--${popoverId}` }}
      >
        <div className="flex items-center justify-between">
          <span className="text-base-content/60 text-xs">{placeholder}</span>
          {allowEmpty && value && (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => select(null)}
            >
              {emptyLabel}
            </button>
          )}
        </div>

        {/* 图标网格：10 × 10，仅图标（名字走 tooltip） */}
        <div className="mt-2 grid grid-cols-10 gap-1">
          {pageIcons.map((name) => (
            <div key={name} className="tooltip" data-tip={name}>
              <button
                type="button"
                className={`btn btn-ghost btn-square btn-xs ${
                  value === name ? 'btn-active' : ''
                }`}
                onClick={() => select(name)}
              >
                <AppIcon name={name} className="size-4" />
              </button>
            </div>
          ))}
        </div>

        {/* 分页：超过一页才显示 */}
        {totalPages > 1 && (
          <div className="mt-2 flex justify-center">
            <div className="join">
              <button
                type="button"
                className="join-item btn btn-xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                «
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`join-item btn btn-xs ${
                    p === page ? 'btn-active' : ''
                  }`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                className="join-item btn btn-xs"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { SORT_OPTIONS, type SkillSort } from './data';

/**
 * 排序胶囊 tablist（参考稿右上）：圆角容器 + 选中项反色药丸。
 * 选中态用 primary（bg-primary text-primary-content）与页面强调色一致；
 * 语义为 daisyUI tab 的 role 语义 + Tailwind 药丸样式（tabs-box 的分体样式与
 * 胶囊形不合，此处自拼）。
 */

interface SortTabsProps {
  value: SkillSort;
  onChange: (sort: SkillSort) => void;
}

export function SortTabs({ value, onChange }: SortTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="排序"
      className="border-base-300 bg-base-100 flex [scrollbar-width:none] gap-0.5 overflow-x-auto rounded-full border p-1 [&::-webkit-scrollbar]:hidden"
    >
      {SORT_OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={
              selected
                ? 'bg-primary text-primary-content h-8 shrink-0 cursor-pointer rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors'
                : 'text-base-content/55 hover:bg-base-content/5 hover:text-base-content h-8 shrink-0 cursor-pointer rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors'
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

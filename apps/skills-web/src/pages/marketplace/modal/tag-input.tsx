import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '@zanelab/ui';

/**
 * TagInput — 标签输入框（任务 11-25-skills-form-upload R3）。
 *
 * 自由输入 + **现有标签模糊搜索**（candidates 来自调用方——编辑打开时从
 * skillsApi.list() 聚合的全库标签去重集传入）：输入触发大小写不敏感 includes
 * 过滤下拉；Enter/点击选中为标签；Backspace 删除末标签。标签按当前语言存储
 * （zh → 主表 tags.styles；en → 副表——语义见 form-state.ts）。
 *
 * 本页专用（不做通用组件下沉——只有此处消费）。
 */

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  /** 现有标签全集（模糊搜索候选；去重） */
  candidates?: string[];
  placeholder?: string;
}

export function TagInput({
  value,
  onChange,
  candidates = [],
  placeholder,
}: TagInputProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    return candidates
      .filter(
        (c) =>
          c.toLowerCase().includes(q) &&
          !value.some((v) => v.toLowerCase() === c.toLowerCase()),
      )
      .slice(0, 8);
  }, [text, candidates, value]);

  const add = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (value.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      setText('');
      return;
    }
    onChange([...value, trimmed]);
    setText('');
    setOpen(false);
  };

  const remove = (tag: string) => {
    onChange(value.filter((v) => v !== tag));
  };

  return (
    <div className="relative">
      <div
        className="border-base-300 bg-base-200 focus-within:border-primary flex min-h-11 w-full flex-wrap items-center gap-1.5 border px-3 py-1.5"
        style={{ '--page-radius': '22px' } as React.CSSProperties}
        onClick={() => setOpen(true)}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="border-base-300 bg-base-100 text-base-content inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12.5px] font-medium"
          >
            {tag}
            <button
              type="button"
              aria-label={`${t('skills.form.tag.remove')}: ${tag}`}
              onClick={(e) => {
                e.stopPropagation();
                remove(tag);
              }}
              className="text-base-content/40 hover:text-base-content"
            >
              <AppIcon name="close" className="size-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          className="text-base-content placeholder:text-base-content/40 min-w-24 flex-1 bg-transparent text-sm outline-none"
          placeholder={value.length === 0 ? placeholder : undefined}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(text);
            } else if (e.key === 'Backspace' && !text && value.length) {
              remove(value[value.length - 1]);
            }
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>

      {open && matches.length > 0 ? (
        <ul className="border-base-300 bg-base-100 absolute top-full left-0 z-10 mt-1 flex w-full flex-col rounded-xl border py-1 shadow-lg">
          {matches.map((c) => (
            <li key={c}>
              <button
                type="button"
                className="text-base-content hover:bg-base-200 w-full px-3 py-1.5 text-left text-[13px]"
                onClick={() => add(c)}
              >
                {c}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

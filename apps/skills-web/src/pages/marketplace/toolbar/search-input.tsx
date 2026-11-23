import { AppIcon } from '@zanelab/ui';
import { useTranslation } from 'react-i18next';
import { FOCUS_RING_HAS_CLASS } from './focus-ring';

/**
 * 关键词搜索框（R4，工具栏左栏第二位）。
 *
 * 外观为工具栏胶囊形（与 SortTabs 容器同总高：h-[42px] + border = 42px；
 * rounded-full border-base-300 bg-base-100 px-4）——自拼容器类而非 daisyUI `input`：
 * `.input` 的圆角/边框参数与胶囊形不一致，覆盖拼装比叠加类名更稳。胶囊类写在
 * 外层 `<label>` 上（框内不止 `<input>` 一个元素，还有前置搜索图标），内部
 * `<input>` 裸化（bg-transparent + flex-1 撑满 + outline-none）。焦点环同理画在
 * `<label>` 上：`<input>` 自身 outline-none，键盘焦点经 has() 映射到胶囊外形
 * （FOCUS_RING_HAS_CLASS，与工具栏其余控件共用一份定义）。
 *
 * 受控 + 可访问名显式给（label 内无可读文本，只有图标）：aria-label 优先于
 * 包装 label 的空文本内容。宽度固定（不 flex 撑开），窄屏换行而不是挤压。
 * 匹配逻辑不在这里内联——见 filters.ts 的 searchSkills。
 */

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchInput({ value, onChange }: SearchInputProps) {
  const { t } = useTranslation();
  return (
    <label
      className={`border-base-300 bg-base-100 inline-flex h-[42px] w-44 min-w-0 shrink-0 cursor-text items-center gap-2 rounded-full border px-4 sm:w-56 ${FOCUS_RING_HAS_CLASS}`}
    >
      <AppIcon name="search" className="text-base-content/45 size-4 shrink-0" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t('skills.toolbar.search')}
        aria-label={t('skills.toolbar.search')}
        className="text-base-content placeholder:text-base-content/45 min-w-0 flex-1 bg-transparent text-[13px] outline-none"
      />
    </label>
  );
}

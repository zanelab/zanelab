import { AppIcon } from '@zanelab/ui';

/**
 * 关键词搜索框（R4，工具栏左栏第二位）。
 *
 * `input` 类写在**外层 `<label>`** 上：框内不止 `<input>` 一个元素（还有前置
 * 搜索图标），依据 daisyUI components/input.md「If the input contains more than
 * one element, use the `input` class on the parent element」——`.input` 本体就是
 * `inline-flex + gap + padding-inline` 的容器形态。
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
  return (
    <label className="input input-sm w-44 min-w-0 shrink-0 sm:w-56">
      <AppIcon name="search" className="text-base-content/45 size-4 shrink-0" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="搜索 Skills"
        aria-label="搜索 Skills"
      />
    </label>
  );
}

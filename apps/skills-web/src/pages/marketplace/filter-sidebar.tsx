import { AppIcon } from '@zanelab/ui';
import { FILTER_GROUPS, type SkillFilterGroup } from './data';

/**
 * 筛选侧栏（参考稿左栏）：全页**唯一**的 `aside` 层，宽度/内边距/底色/描边/滚动
 * 只在这里声明（daisyUI `drawer-side` 不承担撑宽职责——`lg:drawer-open` 下它是
 * `width:auto` 的 sticky 块，列宽由子元素自身决定，见 design.md「侧栏结构契约」）。
 * 底色与页面包裹层同底（base-200），靠 border-r + base-300 与内容列分隔。
 * 所有分组统一「方角复选框 + 可选前置图标 + 标签 + 计数」行；首组（推荐）有标题。
 * 语义色：勾选态用行底色（base-content/8），`primary` 让位给卡片「免费」徽章。
 * 组内多选 OR、组间 AND（见 filters.ts）。
 */

interface FilterSidebarProps {
  active: Record<string, string[]>;
  onToggle: (group: string, value: string) => void;
  /** 小屏 drawer 的关闭入口（桌面常驻侧栏不需要，lg 隐藏） */
  onClose: () => void;
  /**
   * 桌面收起入口（`max-lg:hidden`）。收起后由 marketplace.tsx 摘掉 `lg:drawer-open`，
   * `.drawer-side` 回到 `position:fixed` 覆盖层模式且未被勾选 → visibility:hidden、不占布局宽度；
   * 重新展开的入口在内容区标题行（内容区无法回调侧栏，故 state 归 marketplace.tsx）。
   */
  onCollapse: () => void;
  /** 小屏确认按钮的计数：与顶部计数徽章同口径（总数，非筛选后数量） */
  totalCount: number;
}

/** 单组渲染 */
function FilterSection({
  group,
  active,
  onToggle,
}: {
  group: SkillFilterGroup;
  active: Record<string, string[]>;
  onToggle: (group: string, value: string) => void;
}) {
  const values = active[group.id] ?? [];
  return (
    // 分隔线用 base-300：侧栏底色已改为 base-200（与页面同底），
    // base-200 描边与底色同色会整条不可见
    <section className="border-base-300 mt-4 border-t pt-4 first-of-type:mt-0 first-of-type:border-t-0 first-of-type:pt-0">
      {group.title ? (
        <h3 className="text-base-content/40 mb-1.5 text-[11px] font-semibold">
          {group.title}
        </h3>
      ) : null}
      <ul className="space-y-px">
        {group.options.map((option) => {
          const checked = values.includes(option.value);
          return (
            <li key={option.value}>
              <label
                className={
                  checked
                    ? 'bg-base-content/8 hover:bg-base-content/10 flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-[5px] text-left transition-colors'
                    : 'hover:bg-base-content/5 flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-[5px] text-left transition-colors'
                }
              >
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs rounded-[5px]"
                  checked={checked}
                  onChange={() => onToggle(group.id, option.value)}
                />
                {/* 前置图标（仅「按输出类型」组有）：复选框与标签之间 */}
                {option.icon ? (
                  <AppIcon
                    name={option.icon}
                    className="text-base-content/45 size-[14px] shrink-0"
                  />
                ) : null}
                <span
                  className={
                    checked
                      ? 'text-base-content min-w-0 flex-1 truncate text-xs font-medium'
                      : 'text-base-content/70 min-w-0 flex-1 truncate text-xs transition-colors'
                  }
                >
                  {option.label}
                </span>
                <span className="text-base-content/35 shrink-0 text-[11px] tabular-nums">
                  {option.count}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function FilterSidebar({
  active,
  onToggle,
  onClose,
  onCollapse,
  totalCount,
}: FilterSidebarProps) {
  return (
    <aside className="bg-base-200 border-base-300 flex h-full w-72 flex-col border-r lg:h-dvh lg:w-60">
      {/* 唯一滚动层：面板高度固定，选项列表超长时只滚动这里（确认条不随之滚走） */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-8">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-base-content flex-1 text-xs font-semibold">
            筛选
          </h2>
          {/* 桌面：收起侧栏（对齐参考稿头部图标钮）；重新展开的入口在内容区标题行 */}
          <button
            type="button"
            aria-label="收起筛选"
            className="btn btn-ghost btn-circle btn-sm text-base-content/45 max-lg:hidden"
            onClick={onCollapse}
          >
            <AppIcon name="layout-sidebar-collapse" className="size-3.5" />
          </button>
          {/* 小屏抽屉的关闭入口；桌面侧栏常驻，无需（对齐参考稿 lg:hidden 的关闭钮） */}
          <button
            type="button"
            aria-label="关闭筛选"
            className="btn btn-ghost btn-circle btn-sm text-base-content/45 lg:hidden"
            onClick={onClose}
          >
            <AppIcon name="close" className="size-3.5" />
          </button>
        </div>
        <div>
          {FILTER_GROUPS.map((group) => (
            <FilterSection
              key={group.id}
              group={group}
              active={active}
              onToggle={onToggle}
            />
          ))}
        </div>
      </div>

      {/* 小屏 drawer 的确认收起条（参考稿置于面板底部，不随列表滚走）；
          桌面常驻侧栏无需，lg 隐藏 */}
      <div className="border-base-300 border-t px-4 py-3 lg:hidden">
        <button
          type="button"
          className="btn btn-neutral w-full"
          onClick={onClose}
        >
          查看 {totalCount} 个 Skills
        </button>
      </div>
    </aside>
  );
}

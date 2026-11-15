import { useMemo, useState } from 'react';
import { AppIcon } from '@zanelab/ui';
import { SKILLS, type SkillItem, type SkillSort } from './data';
import { filterSkills, sortSkills, toggleFilter } from './filters';
import { FilterSidebar } from './filter-sidebar';
import { SortTabs } from './sort-tabs';
import { SkillCard } from './skill-card';

/**
 * Agent Skills 市场页（skills-web 首页，布局对齐参考稿）：
 * 单一 daisyUI drawer 承载筛选侧栏——桌面 lg:drawer-open 常驻（可收起）、小屏经
 * 「筛选」按钮开启 drawer 覆盖层（组件规范 §侧边栏与布局的标准形态）。
 * 结果列：标题 / 副标题 / 排序胶囊 / 卡片网格。
 * 计数口径统一为**总数**（对齐参考稿「620 个 Skills」）——标题徽章与小屏确认按钮
 * 同显总数；筛选后的结果反馈只由卡片网格承载（已去 chips，无 N/M 计数）。
 * 侧栏结构：`drawer-side` 的唯一子元素就是 `FilterSidebar` 的 aside（不再套外层
 * aside，避免重复 landmark / 分层声明宽度导致的横向溢出）。
 * drawer 的 `drawer-open` **只由 `filtersCollapsed` 静态决定**，绝不因小屏开合而追加：
 * 小屏若在打开时也套上 `drawer-open`，daisyUI 会把 `.drawer-side` 从覆盖层
 * （fixed/grid/width:100%）翻成内联列（sticky/block/width:auto），内容被挤窄、
 * 遮罩变透明并产生横向溢出；小屏开合只交给受控的 `drawer-toggle`。
 * 筛选组内 OR、组间 AND；排序纯前端。数据为静态种子（data.ts）。
 */
export function MarketplacePage() {
  const [active, setActive] = useState<Record<string, string[]>>({});
  const [sort, setSort] = useState<SkillSort>('recommended');
  const [drawerOpen, setDrawerOpen] = useState(false);
  // 桌面端收起筛选侧栏。纯页面内 state：不持久化（localStorage / store 都不用）。
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);

  const visible: SkillItem[] = useMemo(
    () => sortSkills(filterSkills(SKILLS, active), sort),
    [active, sort],
  );

  const activeCount = Object.values(active).reduce((n, v) => n + v.length, 0);

  const onToggle = (group: string, value: string) =>
    setActive((prev) => toggleFilter(prev, group, value));

  return (
    <div className="bg-base-200 min-h-dvh">
      <div className={`drawer ${filtersCollapsed ? '' : 'lg:drawer-open'}`}>
        <input
          id="skills-filter-drawer"
          type="checkbox"
          className="drawer-toggle"
          checked={drawerOpen}
          onChange={(e) => setDrawerOpen(e.target.checked)}
        />
        <div className="drawer-content min-w-0">
          <main className="px-4 pt-4 pb-16 sm:px-6 lg:px-8">
            <header className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <h1 className="text-base-content text-xl font-semibold tracking-tight sm:text-2xl">
                    Agent Skills 市场
                  </h1>
                  <span className="bg-base-content/6 text-base-content/55 inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold tabular-nums">
                    {SKILLS.length} 个 Skills
                  </span>
                </div>
                <p className="text-base-content/50 mt-1 text-[13px]">
                  Agent Skills 也叫 Claude Skills，适用于 Claude
                  Code、Codex、Cursor、Antigravity，以及所有能读取 SKILL.md 的
                  Agent。
                </p>
              </div>

              <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
                {/* 小屏：筛选按钮（打开 drawer 覆盖层）；桌面侧栏常驻，隐藏 */}
                <button
                  type="button"
                  className="btn btn-outline btn-sm gap-1.5 lg:hidden"
                  onClick={() => setDrawerOpen(true)}
                >
                  筛选
                  {activeCount > 0 ? (
                    <span className="badge badge-neutral badge-xs">
                      {activeCount}
                    </span>
                  ) : null}
                </button>
                {/* 桌面：仅在侧栏收起时出现的「展开筛选」入口（参考稿未留线索，由本项目自定）；
                    与小屏按钮互斥显示（lg:hidden / max-lg:hidden），不影响 <lg 行为 */}
                {filtersCollapsed ? (
                  <button
                    type="button"
                    aria-label="展开筛选"
                    className="btn btn-outline btn-sm gap-1.5 max-lg:hidden"
                    onClick={() => setFiltersCollapsed(false)}
                  >
                    <AppIcon
                      name="layout-sidebar-expand"
                      className="size-3.5"
                    />
                    筛选
                  </button>
                ) : null}
                <div className="min-w-0 flex-1 sm:flex-none">
                  <SortTabs value={sort} onChange={setSort} />
                </div>
              </div>
            </header>

            {/* 结果区标题（参考稿大纲：页面 h1 + sr-only h2 + 卡片 h3） */}
            <h2 className="sr-only">Agent Skills 市场</h2>

            {visible.length > 0 ? (
              <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visible.map((skill) => (
                  <SkillCard key={skill.id} skill={skill} />
                ))}
              </div>
            ) : (
              <div className="border-base-300 text-base-content/50 rounded-2xl border border-dashed py-16 text-center text-sm">
                没有符合筛选条件的 Skills，试试清除部分筛选。
              </div>
            )}
          </main>
        </div>

        <div className="drawer-side">
          {/* drawer-side 不承担撑宽职责（lg:drawer-open 下为 width:auto 的 sticky 块），
              宽度/内边距/底色/描边一律写在 FilterSidebar 唯一的 aside 上。
              小屏：覆盖层 + 滑入面板（确认条在面板底部，见 filter-sidebar.tsx） */}
          <label
            htmlFor="skills-filter-drawer"
            aria-label="关闭筛选"
            className="drawer-overlay"
          />
          <FilterSidebar
            active={active}
            onToggle={onToggle}
            onClose={() => setDrawerOpen(false)}
            onCollapse={() => setFiltersCollapsed(true)}
            totalCount={SKILLS.length}
          />
        </div>
      </div>
    </div>
  );
}

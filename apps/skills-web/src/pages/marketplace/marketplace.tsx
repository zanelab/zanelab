import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react';
import { AppIcon } from '@zanelab/ui';
import { useTranslation } from 'react-i18next';
import { type SkillItem, type SkillSort } from './data';
import {
  filterSkills,
  searchSkills,
  sortSkills,
  toggleFilter,
} from './filters';
import { skillsApi } from '../../api/skills';
import { toSkillItem } from './record';
import { DeleteConfirmModal, SkillFormModal } from './modal/skill-form-modal';
import { FilterSidebar } from './filter-sidebar';
import { MarketplaceFooter } from './footer/footer';
import { SortTabs } from './sort-tabs';
import { SkillCard } from './skill-card';
import { CategoryMenu } from './toolbar/category-menu';
import { SearchInput } from './toolbar/search-input';
import { UploadButton } from './toolbar/upload-button';
import { Permission } from '../../components/permission';
import { getProps } from '../../props';

/**
 * Agent Skills 市场页（skills-web 首页，布局对齐参考稿）：
 * 单一 daisyUI drawer 承载筛选侧栏——桌面 lg:drawer-open 常驻（可收起）、小屏经
 * 「筛选」按钮开启 drawer 覆盖层（组件规范 §侧边栏与布局的标准形态）。
 *
 * 标题区两行（R1/R2）：第一行标题块（h1 + 计数徽章 + 副标题）独占；第二行是控件区
 * ——左栏 筛选 → 搜索 → 分类，右栏 排序胶囊 → 上传 skills。
 * 分类下拉打开时控件行整体 `relative z-50`（遮罩 z-40 挂在 body，见 category-menu.tsx）：
 * 遮罩压暗页面其余部分而控件行保持可见可点（AC7），且弹层因此以控件行为定位基准。
 *
 * 结果列：筛选（组内 OR、组间 AND）→ 搜索（子串，与筛选 AND）→ 排序，全部是
 * filters.ts 的纯函数；数据经 skillsApi.list() 拉取（null = 加载中，失败落
 * 错误态 + 重试）——11-23-skills-crud-mock R5。新建/编辑/删除经 SkillFormModal /
 * DeleteConfirmModal，成功后 reloadKey++ 触发重拉（单一重拉驱动点）。
 * 计数口径统一为**总数**（对齐参考稿「620 个 Skills」）——标题徽章与小屏确认按钮
 * 同显总数；筛选/搜索后的结果反馈只由卡片网格承载（已去 chips，无 N/M 计数）。
 * 侧栏结构：`drawer-side` 的唯一子元素就是 `FilterSidebar` 的 aside（不再套外层
 * aside，避免重复 landmark / 分层声明宽度导致的横向溢出）。
 * drawer 的 `drawer-open` **只由 `filtersCollapsed` 静态决定**，绝不因小屏开合而追加：
 * 小屏若在打开时也套上 `drawer-open`，daisyUI 会把 `.drawer-side` 从覆盖层
 * （fixed/grid/width:100%）翻成内联列（sticky/block/width:auto），内容被挤窄、
 * 遮罩变透明并产生横向溢出；小屏开合只交给受控的 `drawer-toggle`。
 */
export function MarketplacePage() {
  const { t } = useTranslation();
  // ---- 数据拉取（skillsApi.list）：null = 加载中；'' = 无错误 ----
  const [skills, setSkills] = useState<SkillItem[] | null>(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    // alive 守卫：卸载/重拉竞态下不回写过期响应
    let alive = true;
    setSkills(null);
    setError('');
    skillsApi
      .list()
      .then((rows) => {
        if (alive) setSkills(rows.map(toSkillItem));
      })
      .catch((e: unknown) => {
        if (alive)
          setError((e as Error).message || t('skills.market.loadError'));
      });
    return () => {
      alive = false;
    };
    // t 进依赖：错误兜底文案随语言重建（重拉时取当前语言）
  }, [reloadKey, t]);

  // ---- 弹窗状态（页面层持有：成功后统一走 reload + 关闭）----
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SkillItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SkillItem | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (skill: SkillItem) => {
    setEditing(skill);
    setFormOpen(true);
  };

  const [active, setActive] = useState<Record<string, string[]>>({});
  const [sort, setSort] = useState<SkillSort>('recommended');
  const [query, setQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  // 桌面端收起筛选侧栏。纯页面内 state：不持久化（localStorage / store 都不用）。
  // 默认收起：首屏聚焦内容列，侧栏经「筛选」按钮展开（R：默认隐藏筛选）。
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  // 分类下拉的开合归页面持有：控件行的 z 序（见上）依赖它
  const [categoryOpen, setCategoryOpen] = useState(false);

  // 主题圆角联动（iam 管理页 --page-radius 同款模式）：宿主
  // props.preferences.radius（rem 字符串）→ 页面根内联 CSS 变量 → 大圆角容器
  // rounded-(--page-radius)。独立态无 props → 中性缺省 '0.5'。
  // 胶囊控件保持 rounded-full 不跟随（iam 同款取舍：大容器表达主题圆角，
  // 小控件保持功能形态）。
  const prefs = {
    radius: '0.5',
    ...(getProps().preferences as Record<string, unknown> | undefined),
  } as { radius?: string };
  const pageRadiusStyle = {
    '--page-radius': `${prefs.radius}rem`,
  } as CSSProperties;

  const total = skills?.length ?? 0;

  const visible: SkillItem[] = useMemo(
    () =>
      sortSkills(searchSkills(filterSkills(skills ?? [], active), query), sort),
    [skills, active, query, sort],
  );

  const activeCount = Object.values(active).reduce((n, v) => n + v.length, 0);

  const onToggle = (group: string, value: string) =>
    setActive((prev) => toggleFilter(prev, group, value));

  return (
    <div className="bg-base-200 min-h-dvh" style={pageRadiusStyle}>
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
            <header className="mb-5">
              {/* R1：标题块独占一行 */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <h1 className="text-base-content text-xl font-semibold tracking-tight sm:text-2xl">
                    {t('skills.market.title')}
                  </h1>
                  <span className="bg-base-content/6 text-base-content/55 inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold tabular-nums">
                    {t('skills.market.countSuffix', { count: total })}
                  </span>
                </div>
                <p className="text-base-content/50 mt-1 text-[13px]">
                  {t('skills.market.subtitle')}
                </p>
              </div>

              {/* R2：控件区另起一行，左 筛选→搜索→分类 / 右 排序→上传 skills */}
              <div
                className={`relative mt-4 flex flex-wrap items-center gap-x-2 gap-y-3 ${
                  categoryOpen ? 'z-50' : ''
                }`}
              >
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  {/* 小屏：筛选按钮（打开 drawer 覆盖层）；桌面侧栏常驻，隐藏 */}
                  <button
                    type="button"
                    // 胶囊形与 SortTabs 同款（sort-tabs.tsx：h-8 rounded-full
                    // border-base-300 bg-base-100 px-3.5 text-[13px] font-semibold）
                    className="border-base-300 bg-base-100 hover:bg-base-content/5 inline-flex h-[42px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold transition-colors lg:hidden"
                    onClick={() => setDrawerOpen(true)}
                  >
                    {t('skills.market.filter')}
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
                      aria-label={t('skills.market.expandFilter')}
                      className="border-base-300 bg-base-100 hover:bg-base-content/5 inline-flex h-[42px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold transition-colors max-lg:hidden"
                      onClick={() => setFiltersCollapsed(false)}
                    >
                      <AppIcon
                        name="layout-sidebar-expand"
                        className="size-3.5"
                      />
                      {t('skills.market.filter')}
                    </button>
                  ) : null}
                  <SearchInput value={query} onChange={setQuery} />
                  <CategoryMenu
                    open={categoryOpen}
                    onOpenChange={setCategoryOpen}
                    active={active}
                    onToggle={onToggle}
                  />
                </div>

                <div className="flex min-w-0 items-center gap-2">
                  <div className="min-w-0 flex-1 sm:flex-none">
                    <SortTabs value={sort} onChange={setSort} />
                  </div>
                  {/* 上传入口：无权限（宿主注入且不含码）即整块不渲染 */}
                  <Permission code="skills:skill:create">
                    <UploadButton onCreate={openCreate} />
                  </Permission>
                </div>
              </div>
            </header>

            {/* 结果区标题（参考稿大纲：页面 h1 + sr-only h2 + 卡片 h3） */}
            <h2 className="sr-only">{t('skills.market.srTitle')}</h2>

            {/* 加载态 / 错误态（接口拉取，11-23-skills-crud-mock R5） */}
            {skills === null ? (
              <div
                role="status"
                className="text-base-content/50 flex items-center justify-center gap-2 py-16 text-sm"
              >
                <span className="loading loading-spinner loading-sm" />
                {t('skills.market.loading')}
              </div>
            ) : error ? (
              <div
                role="alert"
                className="flex flex-col items-center gap-3 py-16 text-sm"
              >
                <span className="text-error">
                  {error || t('skills.market.loadError')}
                </span>
                <button type="button" className="btn btn-sm" onClick={reload}>
                  {t('skills.market.retry')}
                </button>
              </div>
            ) : visible.length > 0 ? (
              <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visible.map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            ) : (
              <div className="border-base-300 text-base-content/50 rounded-(--page-radius) border border-dashed py-16 text-center text-sm">
                {t('skills.market.empty')}
              </div>
            )}

            {/* 页脚营销区（参考站 section.mt-16）：纯展示，不受筛选/搜索影响；
                统计数字随拉取数据（skills 就绪后才渲染页脚） */}
            {skills ? <MarketplaceFooter skills={skills} /> : null}
          </main>
        </div>

        <div className="drawer-side">
          {/* drawer-side 不承担撑宽职责（lg:drawer-open 下为 width:auto 的 sticky 块），
              宽度/内边距/底色/描边一律写在 FilterSidebar 唯一的 aside 上。
              小屏：覆盖层 + 滑入面板（确认条在面板底部，见 filter-sidebar.tsx） */}
          <label
            htmlFor="skills-filter-drawer"
            aria-label={t('skills.market.closeFilter')}
            className="drawer-overlay"
          />
          <FilterSidebar
            active={active}
            onToggle={onToggle}
            onClose={() => setDrawerOpen(false)}
            onCollapse={() => setFiltersCollapsed(true)}
            totalCount={total}
          />
        </div>
      </div>

      {/* 新建/编辑 + 删除确认弹窗（页面层持有状态；成功回调统一重拉列表） */}
      <SkillFormModal
        open={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          reload();
        }}
      />
      <DeleteConfirmModal
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onSaved={() => {
          setDeleteTarget(null);
          reload();
        }}
      />
    </div>
  );
}

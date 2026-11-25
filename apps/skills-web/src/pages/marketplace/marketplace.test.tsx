import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import i18n from '../../locales/i18n';
import { setProps } from '../../props';
import { MarketplacePage } from './marketplace';
import { TRANSITION_MS } from './toolbar/category-menu';

/** 表单弹窗定位（Modal 壳：aria-labelledby="skill-form-title" 的 h2 在
 *  div[role=dialog] 卡片内——closest 找 role=dialog 容器）。 */
function formDialog() {
  return document
    .getElementById('skill-form-title')!
    .closest('[role="dialog"]') as HTMLElement;
}
/** 删除确认弹窗定位（同上，aria-labelledby="skill-delete-title"）。 */
function deleteDialog() {
  return document
    .getElementById('skill-delete-title')!
    .closest('[role="dialog"]') as HTMLElement;
}
/** 表单弹窗是否在文档中（waitFor 关闭断言用；不抛错）。 */
function formDialogOrNull() {
  return document.getElementById('skill-form-title');
}
/** 删除确认弹窗是否在文档中（同上）。 */
function deleteDialogOrNull() {
  return document.getElementById('skill-delete-title');
}

// jsdom 无布局引擎，网格列数/粘性定位类名只做存在性断言；
// 交互行为（筛选收窄 / 排序 / 空态）是本页核心契约，断言不依赖类名。
// 11-23-skills-crud-mock：数据改经 skillsApi.list() 异步拉取（MSW node server
// 拦截，src/test/setup.ts 全局起停）——renderPage 等待列表就绪再返回。

async function renderPage() {
  const utils = render(
    <MemoryRouter>
      <MarketplacePage />
    </MemoryRouter>,
  );
  // 列表就绪的锚点 = 计数徽章（总数口径「14 个 Skills」，与种子条数一致）
  await screen.findByText('14 个 Skills');
  return utils;
}

/** 卡片列表（`article`）；卡片标题是 h3，与侧栏分组标题（h3）区分开 */
function cards() {
  return screen.getAllByRole('article');
}

/** 侧栏选项：label 包住 input，可访问名 = 标签文本 + 计数（如「免费42」） */
function option(name: string) {
  return screen.getByRole('checkbox', { name: new RegExp(name) });
}

/** 侧栏（全页唯一 aside）——分组标题与分类下拉的分组名会重名，需限定范围 */
function sidebar(container: HTMLElement) {
  return within(container.querySelector('aside') as HTMLElement);
}

/** 分类下拉：受控开合。closed 相位不渲染弹层；关闭后先走 closing 相位播出场
 *  过渡（R5），350ms 后才卸载——「已卸载」断言一律包 waitFor */
function openCategoryMenu() {
  return screen.getByRole('button', { name: '分类' });
}
function categoryMenu() {
  return screen.queryByRole('tablist', { name: '分类' });
}
function categoryPanel() {
  return screen.getByRole('tabpanel');
}
/** 遮罩经 portal 挂在 body 下（对齐参考站的门户层） */
function categoryOverlay() {
  return document.getElementById('skills-category-overlay');
}

describe('MarketplacePage', () => {
  it('渲染标题、总数徽章与卡片网格，且无「已经到底了。」页脚', async () => {
    await renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Agent Skills 市场' }),
    ).toBeInTheDocument();
    // 参考稿口径：徽章显示**总数**（「620 个 Skills」），筛选后不再显示 N / M
    // （R9 + design.md「计数徽章口径」：结果收窄只由卡片网格承载）
    expect(screen.getByText('14 个 Skills')).toBeInTheDocument();
    expect(cards()).toHaveLength(14);
    // 参考稿列表区没有「已经到底了。」这类本地元素（R11）
    expect(screen.queryByText('已经到底了。')).not.toBeInTheDocument();
  });

  it('渲染全部排序选项，默认选中「推荐」', async () => {
    await renderPage();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual([
      '推荐',
      '最新发布',
      '热门',
      '评分最高',
    ]);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('渲染技能卡片（标题 + 免费徽章）', async () => {
    await renderPage();
    expect(screen.getByText('薄荷暗夜软件产品官网')).toBeInTheDocument();
    // 「免费」同时出现在侧栏选项里，故限定在卡片内计数：14 条种子中 12 条免费
    expect(
      cards().filter((card) => within(card).queryByText('免费')),
    ).toHaveLength(12);
    expect(
      cards().filter((card) => within(card).queryByText('付费')),
    ).toHaveLength(2);
  });

  it('卡片含媒体类型圆标与统计浮层', async () => {
    await renderPage();
    const first = cards()[0];
    // 媒体类型圆标带 sr-only 文案（outputTypes[0]）
    expect(within(first).getByText('网页')).toHaveClass('sr-only');
    // 统计：安装数 + 点赞数（下载 340 / 收藏 6）
    expect(within(first).getByText('340')).toBeInTheDocument();
    expect(within(first).getByText('6')).toBeInTheDocument();
  });

  it('侧栏渲染 5 个筛选分组（含「按使用场景」与「按 Agent」）', async () => {
    const { container } = await renderPage();
    const aside = sidebar(container);
    expect(aside.getByText('按输出类型')).toBeInTheDocument();
    expect(aside.getByText('按角色')).toBeInTheDocument();
    expect(aside.getByText('按使用场景')).toBeInTheDocument();
    // 「按 Agent」是 11-16 R7/D9 新增的第 5 组（参考站只在下拉里有该维度）
    expect(aside.getByText('按 Agent')).toBeInTheDocument();
    expect(
      aside.getByRole('checkbox', { name: /Claude Code/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('知识解释与教学').length).toBeGreaterThan(0);

    // 前置图标只在「按输出类型」组（参考稿：该组四个选项带图形）
    const rowIcons = (name: string) =>
      screen
        .getByRole('checkbox', { name: new RegExp(name) })
        .closest('label')
        ?.querySelectorAll('svg').length ?? 0;
    expect(rowIcons('视频')).toBe(1);
    expect(rowIcons('图像')).toBe(1);
    expect(rowIcons('免费')).toBe(0);
    expect(rowIcons('教师')).toBe(0);
    expect(rowIcons('知识解释与教学')).toBe(0);
    // 新增的「按 Agent」组也不带前置图标
    expect(rowIcons('Cursor')).toBe(0);
  });

  it('勾选「免费」筛选：卡片收窄到 12 条', async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(option('免费'));
    expect(cards()).toHaveLength(12);
    expect(screen.queryByText('融资路演幻灯片生成')).not.toBeInTheDocument();
    expect(screen.getByText('薄荷暗夜软件产品官网')).toBeInTheDocument();
    // 计数徽章按 R9 保持**总数**口径（对齐参考稿「620 个 Skills」）：
    // 筛选产生的收窄反馈只由卡片网格承载——此处显式锚定，避免被当成漏改
    expect(screen.getByText('14 个 Skills')).toBeInTheDocument();
  });

  it('切到「热门」排序：热门（452 下载）排第一', async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(screen.getByRole('tab', { name: '热门' }));
    expect(
      within(cards()[0]).getByRole('heading', { level: 3 }),
    ).toHaveTextContent('融资路演幻灯片生成');
  });

  // AC7「排序 4 项切换生效」：逐个点 tab 并核对卡片网格的前两张。
  // 说明：latest 与 rating 在现有种子下前几位恰好重合（种子按推荐序编排），
  // 故「首两张」断言不能区分这两者——精确排序语义由 filters.test.ts 的
  // sortSkills 用例覆盖，这里锁定的是 tab → 排序生效的接线。
  it.each([
    ['推荐', ['薄荷暗夜软件产品官网', '橙焙电单车商店']],
    ['最新发布', ['融资路演幻灯片生成', '薄荷暗夜软件产品官网']],
    ['热门', ['融资路演幻灯片生成', '短视频产品口播脚本']],
    ['评分最高', ['融资路演幻灯片生成', '薄荷暗夜软件产品官网']],
  ])('排序「%s」切换生效：卡片网格重排', async (tab, expected) => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(screen.getByRole('tab', { name: tab }));
    expect(
      cards()
        .slice(0, 2)
        .map(
          (card) => within(card).getByRole('heading', { level: 3 }).textContent,
        ),
    ).toEqual(expected);
    expect(screen.getByRole('tab', { name: tab })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('免费 × 教师（组间 AND）→ 只剩课堂教学课件助手', async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(option('免费'));
    await user.click(option('教师'));
    // 种子里免费 × 教师恰好 1 条
    expect(cards()).toHaveLength(1);
    expect(screen.getByText('课堂教学课件助手')).toBeInTheDocument();
    expect(screen.queryByText('薄荷暗夜软件产品官网')).not.toBeInTheDocument();
  });

  it('免费 × 顾问（组间 AND 无交集）→ 空态提示、无卡片', async () => {
    const user = userEvent.setup();
    await renderPage();
    // 顾问只有 1 条（融资路演幻灯片生成）且付费 → 免费 × 顾问 = 空
    await user.click(option('免费'));
    await user.click(option('顾问'));
    expect(screen.getByText(/没有符合筛选条件的 Skills/)).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });

  it('场景组参与筛选：知识解释与教学 → 2 条（不与角色值交叉命中）', async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(option('知识解释与教学'));
    // 种子里带该场景的是 融资路演幻灯片生成 + 课堂教学课件助手
    expect(cards()).toHaveLength(2);
    expect(screen.getByText('课堂教学课件助手')).toBeInTheDocument();
    expect(screen.queryByText('薄荷暗夜软件产品官网')).not.toBeInTheDocument();
  });

  it('侧栏只有一层 aside，且底色与页面同底（不用 base-100 白面板）', async () => {
    const { container } = await renderPage();
    const asides = container.querySelectorAll('aside');
    expect(asides).toHaveLength(1);
    // drawer-side 不承担撑宽职责：唯一的 aside 必须是它的直接子元素
    expect(asides[0].parentElement).toHaveClass('drawer-side');
    expect(asides[0]).toHaveClass('bg-base-200');
    expect(asides[0]).not.toHaveClass('bg-base-100');
  });

  it('侧栏分组分隔线用可见语义描边色（不与侧栏底色同色）', async () => {
    const { container } = await renderPage();
    // 5 个分组：推荐 / 按输出类型 / 按角色 / 按使用场景 / 按 Agent
    const groups = container.querySelectorAll('aside section');
    expect(groups).toHaveLength(5);
    groups.forEach((group) => {
      expect(group).toHaveClass('border-t', 'border-base-300');
      // 回归：侧栏底色改成 base-200 后，border-base-200 与底色同色 → 分隔线不可见
      expect(group).not.toHaveClass('border-base-200');
    });
  });

  it('小屏打开抽屉不给容器追加 drawer-open（小屏开合只走隐藏复选框）', async () => {
    const user = userEvent.setup();
    const { container } = await renderPage();
    const drawer = container.querySelector('.drawer');
    const box = document.getElementById(
      'skills-filter-drawer',
    ) as HTMLInputElement;
    expect(box.checked).toBe(false);

    await user.click(screen.getByRole('button', { name: '筛选' }));
    expect(box.checked).toBe(true);
    // 若此处追加 `drawer-open`，daisyUI 会把 .drawer-side 从覆盖层翻成内联列
    // （内容被挤窄 + 遮罩透明 + 横向溢出）。侧栏默认收起（filtersCollapsed
    // 初始为 true），小屏开合不追加该类（模板串留尾随空格，trim 后比对）
    expect(drawer?.className.trim()).toBe('drawer');
  });

  it('桌面默认收起侧栏：展开/收起按 filtersCollapsed 增删 lg:drawer-open', async () => {
    const user = userEvent.setup();
    const { container } = await renderPage();
    const drawer = container.querySelector('.drawer');
    // 默认收起：首屏只有「展开筛选」入口，容器不带 lg:drawer-open
    expect(drawer?.className).not.toContain('lg:drawer-open');
    expect(
      screen.getByRole('button', { name: '展开筛选' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '展开筛选' }));
    expect(drawer?.className).toContain('lg:drawer-open');
    expect(
      screen.queryByRole('button', { name: '展开筛选' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '收起筛选' }));
    expect(drawer?.className).not.toContain('lg:drawer-open');
    expect(
      screen.getByRole('button', { name: '展开筛选' }),
    ).toBeInTheDocument();
  });

  it('卡片自持层叠上下文：卡内浮层 z-index 不逃逸到页面级（抽屉被穿透的回归）', async () => {
    await renderPage();
    const card = cards()[0];
    /** 取元素上的 z-index 工具类（z-10 / z-[15] / z-30 …） */
    const zTokens = (el: Element) =>
      (el.getAttribute('class') ?? '')
        .split(/\s+/)
        .filter((c) => /^z-(\d+|\[.+\])$/.test(c));
    const overlays = [...card.querySelectorAll('*')].filter(
      (el) => zTokens(el).length > 0,
    );
    // 前提：卡片浮层确实带 z-index（否则本用例无意义）
    expect(overlays.length).toBeGreaterThan(0);
    expect(overlays.some((el) => Number(zTokens(el)[0].slice(2)) > 10)).toBe(
      true,
    );
    // 不变量：article 必须建立层叠上下文（isolate），把这些 z 值收束在卡片内。
    // 否则它们会与页面级元素同场竞争——daisyUI 的 .drawer 是 position:relative +
    // z-index:auto，小屏打开的 .drawer-side（fixed, z-index:10）会被 z-15/20/30
    // 的浮层盖住，筛选面板上会浮出「免费」徽章与统计数字。
    expect(card).toHaveClass('isolate');
  });

  it('收起/展开按钮的图标经 AppIcon 解析（svg + path 存在）', async () => {
    const user = userEvent.setup();
    const { container } = await renderPage();
    // 侧栏默认收起：先展开，才能拿到「收起筛选」按钮
    await user.click(screen.getByRole('button', { name: '展开筛选' }));
    const btn = screen.getByRole('button', { name: '收起筛选' });
    // layout-sidebar-collapse 在 BUILTIN_ICONS 中；解析失败会渲染 null
    expect(btn.querySelectorAll('svg path').length).toBeGreaterThan(0);
    expect(
      container.querySelectorAll('aside button svg').length,
    ).toBeGreaterThan(0);
  });
});

// 11-23-skills-i18n-radius：主题圆角联动（iam 管理页 --page-radius 同款契约）。
// jsdom 无布局引擎，锁「变量注入 + 值来源」两个契约点：
// 变量挂页面根 div 的内联 style；值取 props.preferences.radius，未下发用缺省。
describe('MarketplacePage —— radius 主题联动', () => {
  it('独立态（无 props）：--page-radius 用中性缺省 0.5rem', async () => {
    const { container } = await renderPage();
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue('--page-radius')).toBe('0.5rem');
  });

  it('集成态：--page-radius 跟随 props.preferences.radius（宿主 rem 字符串）', async () => {
    setProps({
      preferences: {
        mode: 'light',
        colorPrimary: '',
        colorDestructive: '',
        colorSuccess: '',
        colorWarning: '',
        radius: '1.25',
        fontSize: 14,
        colorGrayMode: false,
        colorWeakMode: false,
        locale: 'zh-CN',
      },
    });
    const { container, unmount } = await renderPage();
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue('--page-radius')).toBe('1.25rem');
    unmount();
    setProps({}); // 复位，防污染后续用例（getter 语义读 savedProps）
  });
});

// 11-16 R1/R2：标题区从「同一行两端分布」改为「标题块独占一行 + 控件区另起一行」，
// 控件区自身分左右两栏。jsdom 无布局引擎，这里锁的是一行归属与 DOM 顺序
// （视觉左右分栏与真实 z 序由 CDP 实测，见任务验收记录）。
describe('MarketplacePage —— 标题区两行与控件区两栏', () => {
  it('标题块独占一行，控件区在另一行，且标题块内无任何控件', async () => {
    const { container } = await renderPage();
    const header = container.querySelector('header') as HTMLElement;
    const rows = [...header.children] as HTMLElement[];
    expect(rows).toHaveLength(2);
    // 第一行：h1 + 计数徽章 + 副标题
    expect(rows[0].querySelector('h1')).not.toBeNull();
    expect(within(rows[0]).getByText('14 个 Skills')).toBeInTheDocument();
    expect(rows[0].querySelector('button')).toBeNull();
    // 第二行：控件区（不再与标题块同行两端分布）
    expect(rows[1].querySelector('h1')).toBeNull();
    expect(rows[1].querySelector('button')).not.toBeNull();
  });

  it('左栏 DOM 顺序为 筛选 → 搜索 → 分类，且与右侧 排序/上传 分属两个容器', async () => {
    const { container } = await renderPage();
    const header = container.querySelector('header') as HTMLElement;
    const controls = [
      screen.getByRole('button', { name: '筛选' }),
      screen.getByRole('searchbox', { name: '搜索 Skills' }),
      screen.getByRole('button', { name: '分类' }),
      screen.getByRole('tablist', { name: '排序' }),
      screen.getByRole('button', { name: '上传 skills' }),
    ];
    controls.forEach((el) => expect(header.contains(el)).toBe(true));
    const precedes = (a: Element, b: Element) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    for (let i = 1; i < controls.length; i++) {
      expect(precedes(controls[i - 1], controls[i])).toBe(true);
    }
    // 左栏容器 = 搜索框（label.input 的父元素）：含 筛选/搜索/分类，不含 排序/上传
    const leftColumn = (controls[1] as HTMLElement).closest('label')
      ?.parentElement as HTMLElement;
    expect(leftColumn.contains(controls[0])).toBe(true);
    expect(leftColumn.contains(controls[2])).toBe(true);
    expect(leftColumn.contains(controls[3])).toBe(false);
    expect(leftColumn.contains(controls[4])).toBe(false);
  });

  it('搜索无结果时复用空态块，文案同时覆盖筛选与搜索', async () => {
    const user = userEvent.setup();
    await renderPage();
    const input = screen.getByRole('searchbox', { name: '搜索 Skills' });
    await user.type(input, '不存在的关键词');
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.getByText(/没有符合筛选条件的 Skills/)).toBeInTheDocument();
    expect(screen.getByText(/换个搜索关键词/)).toBeInTheDocument();
  });
});

// 11-16 R4：搜索是纯函数（filters.ts 的 searchSkills），组件侧只受控；
// 与筛选是 AND 关系（组合顺序 filter → search → sort）。
describe('MarketplacePage —— 搜索', () => {
  it('title / roles / scenes 命中并实时收窄卡片网格，清空后恢复', async () => {
    const user = userEvent.setup();
    await renderPage();
    const input = screen.getByRole('searchbox', { name: '搜索 Skills' });

    await user.type(input, '薄荷');
    expect(cards()).toHaveLength(1);
    expect(screen.getByText('薄荷暗夜软件产品官网')).toBeInTheDocument();
    // 计数徽章按既有约定仍是**总数**（收窄反馈只由卡片网格承载）
    expect(screen.getByText('14 个 Skills')).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, '知识解释与教学');
    expect(cards()).toHaveLength(2);
    expect(screen.getByText('课堂教学课件助手')).toBeInTheDocument();

    await user.clear(input);
    expect(cards()).toHaveLength(14);
  });

  it('搜索 × 筛选叠加为 AND', async () => {
    const user = userEvent.setup();
    await renderPage();
    const input = screen.getByRole('searchbox', { name: '搜索 Skills' });

    // 「教师」只有 1 条（课堂教学课件助手），且是免费的
    await user.type(input, '教师');
    expect(cards()).toHaveLength(1);

    // 再叠加「精选」筛选：该条不是精选 → AND 后为空（若实现是 OR 就会留下 1 条）
    await user.click(option('精选'));
    expect(screen.queryAllByRole('article')).toHaveLength(0);

    // 换成「免费」筛选 → 仍剩 1 条
    await user.click(option('精选'));
    await user.click(option('免费'));
    expect(cards()).toHaveLength(1);
    expect(screen.getByText('课堂教学课件助手')).toBeInTheDocument();
  });

  it('搜索 agent 全称（Cursor）与缩写码（CU）等价', async () => {
    const user = userEvent.setup();
    await renderPage();
    const input = screen.getByRole('searchbox', { name: '搜索 Skills' });
    await user.type(input, 'Cursor');
    // 种子里 agents 含 CU 的 11 条
    expect(cards()).toHaveLength(11);
    await user.clear(input);
    await user.type(input, 'cu');
    expect(cards()).toHaveLength(11);
  });
});

// 11-16 R5/R6/R7：分类下拉（daisyUI dropdown 受控 + 全页遮罩 + 两栏 tablist/tabpanel）。
// 弹层走四相位（closed 不渲染；entering/open/closing 渲染）：closed 之外 daisyUI 的
// :focus-within 顶回由 utilities 层类压制、closing 结束即卸载（见 category-menu.tsx）。
// 因此「关闭后」的存在性断言须等 closing 相位播完（waitFor）。
describe('MarketplacePage —— 分类下拉', () => {
  it('受控开合：点开出现 4 个分组 tab 与遮罩，再点收起', async () => {
    const user = userEvent.setup();
    await renderPage();
    expect(categoryMenu()).not.toBeInTheDocument();
    expect(categoryOverlay()).toBeNull();

    await user.click(openCategoryMenu());
    const tablist = categoryMenu() as HTMLElement;
    // R6：对齐参考站下拉的 4 组（不含页内侧栏独有的「推荐」）
    expect(
      within(tablist)
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual(['按使用场景', '按角色', '按输出类型', '按 Agent']);
    expect(
      within(tablist).getByRole('tab', { name: '按使用场景' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(openCategoryMenu()).toHaveAttribute('aria-expanded', 'true');
    // 遮罩存在（portal 挂 body）
    expect(categoryOverlay()).toBeInTheDocument();

    await user.click(openCategoryMenu());
    // 关闭即时反映在受控语义上（aria / 遮罩）；弹层本体走 closing 相位播
    // 出场过渡，350ms 后才真正卸载（R5）
    expect(openCategoryMenu()).toHaveAttribute('aria-expanded', 'false');
    expect(categoryOverlay()).toBeNull();
    await waitFor(() => expect(categoryMenu()).not.toBeInTheDocument());
  });

  it('切换左栏分组：右栏条目随之变化，tabpanel 与被选 tab 关联', async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(openCategoryMenu());

    expect(categoryPanel()).toHaveAttribute('aria-labelledby', 'cat-tab-scene');
    expect(
      within(categoryPanel()).getByRole('button', {
        name: '知识解释与教学',
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '按 Agent' }));
    expect(screen.getByRole('tab', { name: '按 Agent' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(categoryPanel()).toHaveAttribute('aria-labelledby', 'cat-tab-agent');
    // 「按 Agent」组用全称做条目标签（AGENT_LABEL 单一事实源）
    expect(
      within(categoryPanel()).getByRole('button', { name: 'Claude Code' }),
    ).toBeInTheDocument();
  });

  it('点条目：应用对应筛选值并关闭弹层', async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(openCategoryMenu());
    await user.click(
      within(categoryPanel()).getByRole('button', {
        name: '知识解释与教学',
      }),
    );
    await waitFor(() => expect(categoryMenu()).not.toBeInTheDocument());
    // 种子里带该场景的 2 条
    expect(cards()).toHaveLength(2);
    expect(screen.getByText('课堂教学课件助手')).toBeInTheDocument();
  });

  it('点条目（按 Agent 组）：筛选生效，agent 值与其它字段不交叉命中', async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(openCategoryMenu());
    await user.click(screen.getByRole('tab', { name: '按 Agent' }));
    await user.click(
      within(categoryPanel()).getByRole('button', { name: 'Cursor' }),
    );
    await waitFor(() => expect(categoryMenu()).not.toBeInTheDocument());
    // 种子里 agents 含 CU 的 11 条（融资路演 / 短视频口播脚本等不含 CU，故不足 14）
    expect(cards()).toHaveLength(11);
    expect(screen.getByText('品牌插画批量生成')).toBeInTheDocument();
    expect(screen.queryByText('融资路演幻灯片生成')).not.toBeInTheDocument();
  });

  it('Esc 关闭弹层（焦点在弹层内）', async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(openCategoryMenu());
    const firstTab = within(categoryMenu() as HTMLElement).getAllByRole(
      'tab',
    )[0];
    firstTab.focus();
    await user.keyboard('{Escape}');
    expect(categoryOverlay()).toBeNull();
    await waitFor(() => expect(categoryMenu()).not.toBeInTheDocument());
  });

  // AC15 焦点管理：弹层卸载时若不干预，焦点掉到 body——键盘用户失去位置锚点。
  // 三条关闭路径都必须把焦点归还触发器。
  //
  // 断言用 waitFor 包裹：焦点归还是在 phase 转 closed 的 **passive effect** 里做的，
  // 与「面板已从 DOM 移除」不是同一时刻——waitFor(面板消失) 通过时 focus() 可能
  // 还没执行，直接 expect(trigger).toHaveFocus() 会偶发失败。
  it('关闭弹层后焦点归还「分类」触发器（不留焦点在 body 上）', async () => {
    const user = userEvent.setup();
    await renderPage();
    const trigger = openCategoryMenu();

    // 路径一：Esc
    await user.click(trigger);
    within(categoryMenu() as HTMLElement)
      .getAllByRole('tab')[0]
      .focus();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());

    // 路径二：点遮罩
    await user.click(trigger);
    await user.click(categoryOverlay() as HTMLElement);
    await waitFor(() => expect(trigger).toHaveFocus());

    // 路径三：点条目（应用筛选值后关闭）
    await user.click(trigger);
    const panel = document.getElementById(
      'skills-category-panel',
    ) as HTMLElement;
    const firstItem = within(panel)
      .getByRole('tabpanel')
      .querySelector('button') as HTMLElement;
    await user.click(firstItem);
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('点击遮罩关闭弹层', async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(openCategoryMenu());
    await user.click(categoryOverlay() as HTMLElement);
    expect(categoryOverlay()).toBeNull();
    await waitFor(() => expect(categoryMenu()).not.toBeInTheDocument());
  });

  it('进场过渡契约：终态类 + 0.35s 缩放淡入参数，压制 daisyUI 自带淡入 keyframe', async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(openCategoryMenu());
    const panel = document.getElementById(
      'skills-category-panel',
    ) as HTMLElement;
    // jsdom 不算 computed transition，这里锁类名契约：终态（layout effect 已翻转）
    // + R5 参数（scale-90→1 + 淡入，0.35s，cubic-bezier(0.22,1,0.36,1)）。
    // motion-safe 前缀 = prefers-reduced-motion 下无动画；animate-none 压制
    // daisyUI 的 0.2s 纯淡入 keyframe（CSS animation 会劫持 opacity）
    expect(panel).toHaveClass(
      'opacity-100',
      'scale-100',
      'origin-top',
      'animate-none',
    );
    expect(panel).toHaveClass('motion-safe:transition-[opacity,scale]');
    expect(panel).toHaveClass('motion-safe:duration-[350ms]');
    expect(panel).toHaveClass('motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]');
  });

  it('出场过渡：closing 相位保留挂载但切断交互，350ms 后卸载', async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(openCategoryMenu());
    const panel = document.getElementById(
      'skills-category-panel',
    ) as HTMLElement;

    await user.click(openCategoryMenu());
    // closing 相位：弹层仍在 DOM（正在淡出），已回 start 态类且不可交互——
    // 出场途中点面板里的条目不得再次改写筛选值
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveAttribute('inert');
    expect(panel).toHaveClass('pointer-events-none', 'opacity-0', 'scale-90');
    expect(openCategoryMenu()).toHaveAttribute('aria-expanded', 'false');
    // 播完出场过渡后干净卸载（用 id 断言真实卸载，不经 role 查询）
    await waitFor(() =>
      expect(document.getElementById('skills-category-panel')).toBeNull(),
    );
  });

  it('出场中途快速重开：出场定时器被清理，弹层恢复打开且不再被误卸载', async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(openCategoryMenu());
    // fireEvent 同步无延时：关→开间隔为 0，稳定落在出场计时窗口内
    fireEvent.click(openCategoryMenu());
    fireEvent.click(openCategoryMenu());
    expect(categoryMenu()).toBeInTheDocument();
    expect(openCategoryMenu()).toHaveAttribute('aria-expanded', 'true');
    // 越过出场计时窗口后仍打开——若关→开没有清掉旧定时器，这里会被误卸载
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, TRANSITION_MS + 150));
    });
    expect(categoryMenu()).toBeInTheDocument();
    expect(openCategoryMenu()).toHaveAttribute('aria-expanded', 'true');
  });

  it('打开时控件行抬升到遮罩之上（z-50），且遮罩不在控件行内', async () => {
    const user = userEvent.setup();
    const { container } = await renderPage();
    const row = (container.querySelector('header') as HTMLElement)
      .children[1] as HTMLElement;
    expect(row.className).not.toContain('z-50');

    await user.click(openCategoryMenu());
    // 控件行抬到遮罩（z-40，挂 body）之上 → 触发器等行内控件保持可见可点（AC7）。
    // 真实 z 序由 CDP 实测（jsdom 不解析 CSS）。
    expect(row.className).toContain('z-50');
    expect(row.contains(categoryOverlay() as HTMLElement)).toBe(false);
    expect(categoryOverlay()).toHaveClass('fixed', 'inset-0', 'z-40');
  });

  it('弹层宽度受内容列约束（窄屏不横向溢出）：w-[min(688px,100%)] + 窄屏单列堆叠', async () => {
    const user = userEvent.setup();
    const { container } = await renderPage();
    await user.click(openCategoryMenu());
    const panel = container.querySelector(
      '#skills-category-panel',
    ) as HTMLElement;
    // 宽度取内容列与 688px 的较小者；窄屏靠 grid-cols-1 堆叠两栏
    expect(panel.className).toContain('w-[min(688px,100%)]');
    const columns = panel.firstElementChild as HTMLElement;
    expect(columns.className).toContain('grid-cols-1');
    expect(columns.className).toContain('sm:grid-cols-[160px_minmax(0,1fr)]');
  });
});

// 11-14 页脚营销区任务：纯展示（B3）。
// 注意用例文本避开 daisyUI 类名词（如折叠/选项卡/页脚等组件名，daisyUI 5 均有对应
// 组件类），防止被 Tailwind 扫成类名注入死 CSS
// （quality-guidelines「测试文件里的 daisyUI 类名会进产物 CSS」警告）。
describe('MarketplacePage —— 页脚营销区', () => {
  /** 页脚三段的标题（h2，与页面 sr-only h2、侧栏分组 h3 不同层级） */
  const sectionHeadings = () =>
    screen
      .getAllByRole('heading', { level: 2 })
      .filter((h) =>
        [
          '什么是 Agent Skills 市场？',
          '浏览 Agent Skills 库',
          'Agent Skills 市场常见问题',
        ].includes(h.textContent ?? ''),
      );

  /** 页脚容器（section，含 border-t），仅页脚内含这三段标题 */
  function promoSection() {
    const heading = sectionHeadings()[0] as HTMLElement;
    return heading.closest('section') as HTMLElement;
  }

  it('三段营销区齐全：段标题 + 特性卡 4 张 + 分类入口 4 个 + FAQ 5 条', async () => {
    await renderPage();
    expect(sectionHeadings().map((h) => h.textContent)).toEqual([
      '什么是 Agent Skills 市场？',
      '浏览 Agent Skills 库',
      'Agent Skills 市场常见问题',
    ]);
    // 数字从 data.ts 派生（14 条种子 / 12 免费 / 4 个 Agent）
    const promo = promoSection();
    expect(within(promo).getByText('共 14 个 Skills')).toBeInTheDocument();
    expect(within(promo).getByText('12 个免费')).toBeInTheDocument();
    expect(within(promo).getByText('4 个 Agent')).toBeInTheDocument();
  });

  it('纯展示（B3）：页脚内无链接、无按钮、无可聚焦元素', async () => {
    const { container } = await renderPage();
    const promo = promoSection();
    expect(promo.querySelector('a')).toBeNull();
    expect(promo.querySelector('button')).toBeNull();
    expect(promo.querySelectorAll('[tabindex]').length).toBe(0);
    // 页面其余部分不受影响：上传按钮等仍正常存在
    expect(container).toBeTruthy();
  });

  it('FAQ 可开合：默认全部收起，点击问题后展开', async () => {
    await renderPage();
    const promo = promoSection();
    const items = [...promo.querySelectorAll('details')];
    expect(items).toHaveLength(5);
    items.forEach((item) => expect(item.open).toBe(false));

    // 点击 summary 展开（原生 details 语义）
    items[0].querySelector('summary')?.click();
    expect(items[0].open).toBe(true);
    expect(items[1].open).toBe(false);
  });

  it('文案无参考站品牌残留（Skillry / 会员 / CLI / ZIP）', async () => {
    await renderPage();
    const promo = promoSection();
    const text = promo.textContent ?? '';
    ['Skillry', '会员', 'CLI', 'ZIP', '采集站'].forEach((word) => {
      expect(text).not.toContain(word);
    });
  });
});

// 11-16 R8/R9：上传入口按权限码 skills:skill:create 显隐。
// 测试用 setProps 注入权限码（Permission 组件每次 render 读 getProps().permissions，
// 纯快照判定——与 iam-web 同构，无订阅机制）。
describe('MarketplacePage —— 上传入口权限', () => {
  afterEach(() => setProps({}));

  const uploadButton = () =>
    screen.queryByRole('button', { name: '上传 skills' });

  it('① 无宿主（permissions 未注入）→ 显示', async () => {
    await renderPage();
    expect(uploadButton()).toBeInTheDocument();
  });

  it('② 宿主注入且含 skills:skill:create → 显示', async () => {
    setProps({ permissions: ['skills:skill:list', 'skills:skill:create'] });
    await renderPage();
    expect(uploadButton()).toBeInTheDocument();
  });

  it('③ 宿主注入但不含该码 → 隐藏', async () => {
    setProps({ permissions: ['skills:skill:list'] });
    await renderPage();
    expect(uploadButton()).not.toBeInTheDocument();
  });

  it('③b 空数组（有宿主但无权限）→ 隐藏：空数组不等于「无宿主」', async () => {
    setProps({ permissions: [] });
    await renderPage();
    expect(uploadButton()).not.toBeInTheDocument();
  });

  it('④ 含通配 * → 显示', async () => {
    setProps({ permissions: ['*'] });
    await renderPage();
    expect(uploadButton()).toBeInTheDocument();
  });

  // 纯快照语义：无订阅，权限码变化要经重新渲染才反映（宿主 remount / update 重渲）。
  // 锁定「每次 render 重读 getProps()」而非首次渲染冻结快照。
  it('重新渲染时重读 props：先有权限渲染，改为无权限后重渲即隐藏', async () => {
    setProps({ permissions: ['skills:skill:create'] });
    const { rerender } = await renderPage();
    expect(uploadButton()).toBeInTheDocument();

    act(() => setProps({ permissions: ['skills:skill:list'] }));
    rerender(
      <MemoryRouter>
        <MarketplacePage />
      </MemoryRouter>,
    );
    expect(uploadButton()).not.toBeInTheDocument();
  });

  // 11-23-skills-crud-mock R5：占位对话框改造为新建表单弹窗（SkillFormModal）。
  // 点「上传 skills」→ 表单弹窗出现（标题 + 名称输入 + 保存/取消）；Esc 与
  // 取消按钮都能关（受控 dialog.modal-open，jsdom 无 <dialog> 实现同样成立）。
  it('点击「上传 skills」打开新建表单弹窗；Esc 与取消按钮都能关', async () => {
    const user = userEvent.setup();
    setProps({ permissions: ['skills:skill:create'] });
    await renderPage();
    expect(screen.queryByText('新建 Skill')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '上传 skills' }));
    const dialog = formDialog();
    expect(
      within(dialog).getByRole('heading', { name: '新建 Skill' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('textbox', { name: /名称/ }),
    ).toBeInTheDocument();

    // Esc 关闭（受控 keyDown 兜底；真实浏览器原生 Esc 由 <dialog> 处理）
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByText('新建 Skill')).not.toBeInTheDocument(),
    );

    // 重开 + 取消按钮关闭
    await user.click(screen.getByRole('button', { name: '上传 skills' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: '取消' }),
    );
    await waitFor(() =>
      expect(screen.queryByText('新建 Skill')).not.toBeInTheDocument(),
    );
  });
});

// 11-23-skills-crud-mock R5：新建/编辑/删除全链路（MSW mock 内存态）。
// 权限语义：卡片操作钮包 Permission（update/delete 码）——注入码才可见。
describe('MarketplacePage —— 技能 CRUD（表单弹窗 + 删除确认）', () => {
  afterEach(() => setProps({}));

  it('新建：填表提交 → mock 落库 → 列表重拉出新条目（计数徽章 15）', async () => {
    const user = userEvent.setup();
    setProps({ permissions: ['*'] });
    localStorage.setItem('iam_token', 'mock-admin');
    await renderPage();

    await user.click(screen.getByRole('button', { name: '上传 skills' }));
    const dialog = formDialog();
    await user.type(
      within(dialog).getByRole('textbox', { name: /名称/ }),
      '自动化测试技能',
    );
    await user.click(within(dialog).getByRole('button', { name: '保存' }));

    // 弹窗关闭 + 列表重拉（mock 内存态含新条目；计数 14 → 15）
    await waitFor(() => expect(formDialogOrNull()).toBeNull());
    await screen.findByText('自动化测试技能');
    expect(screen.getByText('15 个 Skills')).toBeInTheDocument();
    localStorage.removeItem('iam_token');
  });

  it('编辑：卡片操作钮打开弹窗回填 → 改标题保存 → 列表显示新标题', async () => {
    const user = userEvent.setup();
    setProps({ permissions: ['*'] });
    localStorage.setItem('iam_token', 'mock-admin');
    await renderPage();

    // 第一张卡片（推荐序第一条 = 薄荷暗夜软件产品官网）的编辑钮
    const firstCard = cards()[0];
    await user.click(
      within(firstCard).getByRole('button', {
        name: /编辑 薄荷暗夜软件产品官网/,
      }),
    );
    const dialog = formDialog();
    expect(
      within(dialog).getByRole('heading', { name: '编辑 Skill' }),
    ).toBeInTheDocument();
    const title = within(dialog).getByRole('textbox', {
      name: /名称/,
    }) as HTMLInputElement;
    // 回填：初值 = 行 title（异步双请求——基线 + en 译文；waitFor 初值填充）
    await waitFor(() => expect(title.value).toBe('薄荷暗夜软件产品官网'));

    await user.clear(title);
    await user.type(title, '薄荷暗夜官网（改）');
    await user.click(within(dialog).getByRole('button', { name: '保存' }));

    await waitFor(() => expect(formDialogOrNull()).toBeNull());
    await screen.findByText('薄荷暗夜官网（改）');
    localStorage.removeItem('iam_token');
  });

  it('删除：确认弹窗 → 确认后列表重拉少一条', async () => {
    const user = userEvent.setup();
    setProps({ permissions: ['*'] });
    localStorage.setItem('iam_token', 'mock-admin');
    await renderPage();
    expect(screen.getByText('14 个 Skills')).toBeInTheDocument();

    await user.click(
      within(cards()[0]).getByRole('button', {
        name: /删除 薄荷暗夜软件产品官网/,
      }),
    );
    const dialog = deleteDialog();
    expect(
      within(dialog).getByText(/确定删除「薄荷暗夜软件产品官网」/),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '删除' }));

    await waitFor(() => expect(deleteDialogOrNull()).toBeNull());
    await waitFor(() =>
      expect(screen.getByText('13 个 Skills')).toBeInTheDocument(),
    );
    expect(screen.queryByText('薄荷暗夜软件产品官网')).not.toBeInTheDocument();
    localStorage.removeItem('iam_token');
  });

  it('权限显隐：无 update/delete 码时卡片操作钮不渲染（create 码只给上传按钮）', async () => {
    setProps({ permissions: ['skills:skill:create'] });
    await renderPage();
    expect(
      screen.getByRole('button', { name: '上传 skills' }),
    ).toBeInTheDocument();
    // 全部卡片都没有 编辑/删除 钮
    expect(
      screen.queryByRole('button', { name: /^编辑 / }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^删除 / }),
    ).not.toBeInTheDocument();
  });

  it('保存失败留在弹窗：无 token 提交新建 → 接口 401 msg 显示在弹窗内', async () => {
    const user = userEvent.setup();
    setProps({ permissions: ['*'] });
    // 不注入 token：mock 写操作 401「请先登录」
    await renderPage();
    await user.click(screen.getByRole('button', { name: '上传 skills' }));
    const dialog = formDialog();
    await user.type(
      within(dialog).getByRole('textbox', { name: /名称/ }),
      '匿名技能',
    );
    await user.click(within(dialog).getByRole('button', { name: '保存' }));
    // 弹窗不关 + 错误 alert 展示接口 msg（POST 异步：waitFor 等 alert 出现）
    expect(await within(dialog).findByText('请先登录')).toBeInTheDocument();
    // 清理：关掉弹窗避免残留
    await user.click(within(dialog).getByRole('button', { name: '取消' }));
  });
});

// 11-23-skills-i18n-radius AC1 核心：切语言后市场页文案跟随（useTranslation 订阅
// languageChanged 驱动重渲染）。setup.ts 全局 zh-CN 初始化——用例内切 en 再切回。
describe('MarketplacePage —— 多语言', () => {
  it('切到 en-US：标题/分类/筛选按钮显示英文；切回 zh-CN 恢复', async () => {
    const { unmount } = await renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Agent Skills 市场',
    );
    expect(screen.getByRole('button', { name: '分类' })).toBeInTheDocument();

    await i18n.changeLanguage('en-US');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Agent Skills Marketplace',
    );
    expect(
      screen.getByRole('button', { name: 'Categories' }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search Skills')).toBeInTheDocument();

    await i18n.changeLanguage('zh-CN');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Agent Skills 市场',
    );
    unmount();
  });
});

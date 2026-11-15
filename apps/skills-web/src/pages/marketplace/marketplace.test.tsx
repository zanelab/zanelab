import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MarketplacePage } from './marketplace';

// jsdom 无布局引擎，网格列数/粘性定位类名只做存在性断言；
// 交互行为（筛选收窄 / 排序 / 空态）是本页核心契约，断言不依赖类名。

function renderPage() {
  return render(
    <MemoryRouter>
      <MarketplacePage />
    </MemoryRouter>,
  );
}

/** 卡片列表（`article`）；卡片标题是 h3，与侧栏分组标题（h3）区分开 */
function cards() {
  return screen.getAllByRole('article');
}

/** 侧栏选项：label 包住 input，可访问名 = 标签文本 + 计数（如「免费42」） */
function option(name: string) {
  return screen.getByRole('checkbox', { name: new RegExp(name) });
}

describe('MarketplacePage', () => {
  it('渲染标题、总数徽章与卡片网格，且无「已经到底了。」页脚', () => {
    renderPage();
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

  it('渲染全部排序选项，默认选中「推荐」', () => {
    renderPage();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual([
      '推荐',
      '最新发布',
      '热门',
      '评分最高',
    ]);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('渲染技能卡片（标题 + 免费徽章）', () => {
    renderPage();
    expect(screen.getByText('薄荷暗夜软件产品官网')).toBeInTheDocument();
    // 「免费」同时出现在侧栏选项里，故限定在卡片内计数：14 条种子中 12 条免费
    expect(
      cards().filter((card) => within(card).queryByText('免费')),
    ).toHaveLength(12);
    expect(
      cards().filter((card) => within(card).queryByText('付费')),
    ).toHaveLength(2);
  });

  it('卡片含媒体类型圆标与统计浮层', () => {
    renderPage();
    const first = cards()[0];
    // 媒体类型圆标带 sr-only 文案（outputTypes[0]）
    expect(within(first).getByText('网页')).toHaveClass('sr-only');
    // 统计：安装数 + 点赞数（下载 340 / 收藏 6）
    expect(within(first).getByText('340')).toBeInTheDocument();
    expect(within(first).getByText('6')).toBeInTheDocument();
  });

  it('侧栏渲染 4 个筛选分组（含新增「按使用场景」）', () => {
    renderPage();
    expect(screen.getByText('按输出类型')).toBeInTheDocument();
    expect(screen.getByText('按角色')).toBeInTheDocument();
    expect(screen.getByText('按使用场景')).toBeInTheDocument();
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
  });

  it('勾选「免费」筛选：卡片收窄到 12 条', async () => {
    const user = userEvent.setup();
    renderPage();
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
    renderPage();
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
    renderPage();
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
    renderPage();
    await user.click(option('免费'));
    await user.click(option('教师'));
    // 种子里免费 × 教师恰好 1 条
    expect(cards()).toHaveLength(1);
    expect(screen.getByText('课堂教学课件助手')).toBeInTheDocument();
    expect(screen.queryByText('薄荷暗夜软件产品官网')).not.toBeInTheDocument();
  });

  it('免费 × 顾问（组间 AND 无交集）→ 空态提示、无卡片', async () => {
    const user = userEvent.setup();
    renderPage();
    // 顾问只有 1 条（融资路演幻灯片生成）且付费 → 免费 × 顾问 = 空
    await user.click(option('免费'));
    await user.click(option('顾问'));
    expect(screen.getByText(/没有符合筛选条件的 Skills/)).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });

  it('场景组参与筛选：知识解释与教学 → 2 条（不与角色值交叉命中）', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(option('知识解释与教学'));
    // 种子里带该场景的是 融资路演幻灯片生成 + 课堂教学课件助手
    expect(cards()).toHaveLength(2);
    expect(screen.getByText('课堂教学课件助手')).toBeInTheDocument();
    expect(screen.queryByText('薄荷暗夜软件产品官网')).not.toBeInTheDocument();
  });

  it('侧栏只有一层 aside，且底色与页面同底（不用 base-100 白面板）', () => {
    const { container } = renderPage();
    const asides = container.querySelectorAll('aside');
    expect(asides).toHaveLength(1);
    // drawer-side 不承担撑宽职责：唯一的 aside 必须是它的直接子元素
    expect(asides[0].parentElement).toHaveClass('drawer-side');
    expect(asides[0]).toHaveClass('bg-base-200');
    expect(asides[0]).not.toHaveClass('bg-base-100');
  });

  it('侧栏分组分隔线用可见语义描边色（不与侧栏底色同色）', () => {
    const { container } = renderPage();
    // 4 个分组：推荐 / 按输出类型 / 按角色 / 按使用场景
    const groups = container.querySelectorAll('aside section');
    expect(groups).toHaveLength(4);
    groups.forEach((group) => {
      expect(group).toHaveClass('border-t', 'border-base-300');
      // 回归：侧栏底色改成 base-200 后，border-base-200 与底色同色 → 分隔线不可见
      expect(group).not.toHaveClass('border-base-200');
    });
  });

  it('小屏打开抽屉不给容器追加 drawer-open（小屏开合只走隐藏复选框）', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    const drawer = container.querySelector('.drawer');
    const box = document.getElementById(
      'skills-filter-drawer',
    ) as HTMLInputElement;
    expect(box.checked).toBe(false);

    await user.click(screen.getByRole('button', { name: '筛选' }));
    expect(box.checked).toBe(true);
    // 若此处追加 `drawer-open`，daisyUI 会把 .drawer-side 从覆盖层翻成内联列
    // （内容被挤窄 + 遮罩透明 + 横向溢出）
    expect(drawer?.className).toBe('drawer lg:drawer-open');
  });

  it('桌面收起/展开筛选：drawer 容器按 filtersCollapsed 摘除 lg:drawer-open', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    const drawer = container.querySelector('.drawer');
    expect(drawer?.className).toContain('lg:drawer-open');
    expect(
      screen.queryByRole('button', { name: '展开筛选' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '收起筛选' }));
    expect(drawer?.className).not.toContain('lg:drawer-open');
    expect(
      screen.getByRole('button', { name: '展开筛选' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '展开筛选' }));
    expect(drawer?.className).toContain('lg:drawer-open');
    expect(
      screen.queryByRole('button', { name: '展开筛选' }),
    ).not.toBeInTheDocument();
  });

  it('卡片自持层叠上下文：卡内浮层 z-index 不逃逸到页面级（抽屉被穿透的回归）', () => {
    renderPage();
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

  it('收起/展开按钮的图标经 AppIcon 解析（svg + path 存在）', () => {
    const { container } = renderPage();
    const btn = screen.getByRole('button', { name: '收起筛选' });
    // layout-sidebar-collapse 在 BUILTIN_ICONS 中；解析失败会渲染 null
    expect(btn.querySelectorAll('svg path').length).toBeGreaterThan(0);
    expect(
      container.querySelectorAll('aside button svg').length,
    ).toBeGreaterThan(0);
  });
});

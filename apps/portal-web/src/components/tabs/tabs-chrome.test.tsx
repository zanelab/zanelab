import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TabsChrome } from './tabs-chrome';

// 主题色适配回归护栏（09-09 偏好主题色）：chrome 标签激活态必须消费 primary
// token（--color-primary → hsl(var(--primary))，由 usePreferencesRuntime 按偏好
// 写入 <html>），不得用 dark: 变体回退 accent —— 暗色（默认主题）下换主题色
// 时标签会毫无变化，等同"tabbar 不适配主题色"。

const tabs = [
  { key: 'a', name: 'A', path: '/a', fullPath: '/a', meta: { title: '页面A' } },
  { key: 'b', name: 'B', path: '/b', fullPath: '/b', meta: { title: '页面B' } },
];

function renderChrome(active: string) {
  const { container } = render(
    <TabsChrome active={active} tabs={tabs as never} />,
  );
  return container.querySelector('.tabs-chrome__item.is-active') as HTMLElement;
}

describe('TabsChrome 激活态主题色（09-09 偏好主题色适配）', () => {
  it('激活标签背景用 primary（含弧形 SVG fill），无 dark:accent 回退', () => {
    const activeItem = renderChrome('a');
    const content = activeItem.querySelector(
      '.tabs-chrome__background-content',
    )!;
    expect(content.className).toContain('bg-primary');
    expect(content.className).not.toContain('dark:bg-accent');
    for (const svg of activeItem.querySelectorAll<SVGElement>(
      '.tabs-chrome__background-before, .tabs-chrome__background-after',
    )) {
      const cls = svg.getAttribute('class') ?? '';
      // SVG 的 className 是 SVGAnimatedString，取 class 属性断言
      expect(cls).toContain('fill-primary');
      expect(cls).not.toContain('dark:fill-accent');
    }
  });

  it('激活标签文字/图标用 primary，无 dark:accent-foreground 回退', () => {
    const activeItem = renderChrome('b');
    const main = activeItem.querySelector('.tabs-chrome__item-main')!;
    expect(main.className).toContain('text-primary');
    expect(main.className).not.toContain('dark:text-accent-foreground');
  });
});

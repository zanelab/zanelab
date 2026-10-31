import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SubAppLayer, type SubAppEntry } from './subapp-layer';

// index.css 契约测试用：jsdom 不解析外部 CSS，无法验证真实样式，
// 只能断言「约束选择器存在于基座 CSS 中」（契约测试）。
const INDEX_CSS = readFileSync(resolve(__dirname, '../index.css'), 'utf-8');

afterEach(cleanup);

const APPS: SubAppEntry[] = [
  [
    'iam',
    {
      name: 'iam',
      entry: '//localhost:8081',
      container: '#subapp-container',
      activeRule: '/system',
    } as SubAppEntry[1],
  ],
  [
    'report',
    {
      name: 'report',
      entry: '//localhost:8082',
      activeRule: '/report',
    } as SubAppEntry[1],
  ],
];

function renderLayerAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SubAppLayer apps={APPS} />
    </MemoryRouter>,
  );
}

describe('SubAppLayer（容器常驻层）', () => {
  it('为每个子应用渲染常驻容器 div（container 去 #，缺省 subapp-<name>）', () => {
    renderLayerAt('/dashboard');
    const iam = document.getElementById('subapp-container');
    expect(iam).toBeTruthy();
    expect(iam?.dataset.subapp).toBe('iam');
    const report = document.getElementById('subapp-report');
    expect(report).toBeTruthy();
    expect(report?.dataset.subapp).toBe('report');
  });

  it('activeRule 内可见、外 hidden（div 始终在 DOM——qiankun mount 任何时刻都能找到）', () => {
    renderLayerAt('/system/users');
    expect(document.getElementById('subapp-container')?.hidden).toBe(false);
    expect(document.getElementById('subapp-report')?.hidden).toBe(true);
  });

  it('activeRule 前缀匹配（/report/detail 命中 /report）', () => {
    renderLayerAt('/report/detail');
    expect(document.getElementById('subapp-report')?.hidden).toBe(false);
    expect(document.getElementById('subapp-container')?.hidden).toBe(true);
  });

  it('容器是 qiankun wrapper 的唯一父级：渲染后容器无动态子元素（wrapper 由 qiankun mount 期插入）', () => {
    // DOM 结构契约：index.css 用 `[data-subapp] > div[id^='__qiankun_microapp_wrapper']`
    // 约束 wrapper 高度，前提是 wrapper 是容器的**直接子 div**。这里断言容器
    // 初始为空（无其他子 div 占位），保证 qiankun 插入的 wrapper 就是直接子元素。
    renderLayerAt('/system/users');
    const iam = document.getElementById('subapp-container');
    expect(iam?.querySelectorAll(':scope > div')).toHaveLength(0);
  });

  it('wrapper 填满容器的 CSS 约束在 index.css 集中定义（jsdom 不解析 CSS，做契约断言）', () => {
    // 选择器必须：a) 以 [data-subapp] 为父锚点（SubAppLayer 容器全集）；
    // b) 用 id 前缀匹配所有 qiankun wrapper，禁止逐子应用硬编码完整 id。
    expect(INDEX_CSS).toMatch(
      /\[data-subapp\]\s*>\s*div\[id\^='__qiankun_microapp_wrapper']/,
    );
    // 约束体：宽高各 100%（子应用 height:100% 布局依赖此层有高度）
    const rule = INDEX_CSS.match(
      /\[data-subapp\]\s*>\s*div\[id\^='__qiankun_microapp_wrapper']\s*{([^}]*)}/,
    );
    expect(rule?.[1]).toContain('width: 100%');
    expect(rule?.[1]).toContain('height: 100%');
  });
});

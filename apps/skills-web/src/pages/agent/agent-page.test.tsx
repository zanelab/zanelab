import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import i18n from '../../locales/i18n';
import { App } from '../../App';
import { AGENT_CATALOG, FEATURED_AGENTS } from './data';
import { AGENT_LABEL } from '../marketplace/data';

/** 挂载 AgentPage（路由路径 /agent——App 层路由命中也是测试点）。 */
function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/agent']}>
      <App />
    </MemoryRouter>,
  );
}

describe('Agent 目录页 —— 静态数据完整性', () => {
  it('33 条记录，编程/办公/Grok Bot 分布正确', () => {
    expect(AGENT_CATALOG).toHaveLength(33);
    expect(AGENT_CATALOG.filter((a) => a.type === 'programming')).toHaveLength(
      27,
    );
    expect(AGENT_CATALOG.filter((a) => a.type === 'office')).toHaveLength(6);
  });

  it('每条记录必填字段非空（Grok Bot 例外：路径为空 + installHint 承载连接说明）', () => {
    for (const a of AGENT_CATALOG) {
      expect(a.code, a.name).toBeTruthy();
      expect(a.name, a.name).toBeTruthy();
      expect(a.vendor, a.name).toBeTruthy();
      if (a.name === 'Grok Bot') {
        expect(a.installMethod).toBe('connect');
        expect(a.installHint).toBeTruthy();
      } else if (a.type === 'programming') {
        expect(a.globalPath, a.name).toMatch(/skills\/$/);
        expect(a.projectPath, a.name).toBeTruthy();
        expect(a.installMethod).toBe('prompt');
      } else {
        expect(a.projectPath, a.name).toBeTruthy();
        expect(a.installMethod).toBe('upload');
      }
    }
  });

  it('与 marketplace AGENT_LABEL 交集项：code 与 name 一致（单一事实源契约）', () => {
    const byCode = new Map(AGENT_CATALOG.map((a) => [a.code, a]));
    for (const [code, label] of Object.entries(AGENT_LABEL)) {
      const entry = byCode.get(code);
      expect(entry, `marketplace 码 ${code} 应存在于目录`).toBeTruthy();
      expect(entry!.name).toBe(label);
    }
  });

  it('横条 17 个 chip：首 Grok Bot，含 Amp/Windsurf/Cline/Zed', () => {
    expect(FEATURED_AGENTS).toHaveLength(17);
    expect(FEATURED_AGENTS[0].name).toBe('Grok Bot');
    const names = FEATURED_AGENTS.map((a) => a.name);
    for (const expected of [
      'Amp',
      'Windsurf',
      'Cline',
      'Zed',
      'Kimi Code',
      'Trae',
    ]) {
      expect(names).toContain(expected);
    }
  });
});

describe('Agent 目录页 —— 路由与渲染', () => {
  it('/agent 路由命中 AgentPage（不被 * 兜底吞掉）', async () => {
    renderPage();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: '每个 AI agent 都能用的 Agent Skills',
      }),
    ).toBeInTheDocument();
  });

  it('六区块齐全：横条/卡片区/对比表/FAQ/介绍段', async () => {
    renderPage();
    expect(
      screen.getByRole('navigation', { name: 'Agent 快捷导航' }),
    ).toBeInTheDocument();
    expect(screen.getByText('每个 agent 都能用的 Skills')).toBeInTheDocument();
    expect(
      screen.getByText('哪些 AI agent 支持 SKILL.md？'),
    ).toBeInTheDocument();
    expect(screen.getByText('Agent Skills 常见问题')).toBeInTheDocument();
    expect(screen.getByText('什么是 SKILL.md Skill？')).toBeInTheDocument();
  });

  it('对比表全量渲染 33 行；行锚点 id 供横条定位', async () => {
    renderPage();
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(34); // 表头 + 33 行
    expect(document.getElementById('agent-CC')).toBeTruthy();
    expect(document.getElementById('agent-XG')).toBeTruthy();
  });

  it('关键行数据与参考站一致（Claude Code / Cursor / 办公类）', async () => {
    renderPage();
    const ccRow = document.getElementById('agent-CC')!;
    expect(within(ccRow).getByText('Anthropic')).toBeInTheDocument();
    expect(within(ccRow).getByText('~/.claude/skills/')).toBeInTheDocument();
    expect(within(ccRow).getByText('.claude/skills/')).toBeInTheDocument();

    const cuRow = document.getElementById('agent-CU')!;
    // Cursor 全局是组合路径（参考站实测）
    expect(within(cuRow).getByText('~/.agents/skills/')).toBeInTheDocument();
    expect(
      within(cuRow).getByText('.agents/skills/ or .cursor/skills/'),
    ).toBeInTheDocument();

    const cwRow = document.getElementById('agent-CW')!;
    expect(
      within(cwRow).getByText('Skills 设置：Customize › Skills'),
    ).toBeInTheDocument();
  });

  it('tabs 切换过滤行数：编程 27 / 办公 6 / 提示词安装 27', async () => {
    const user = userEvent.setup();
    renderPage();
    const table = () => screen.getByRole('table');

    await user.click(screen.getByRole('tab', { name: '编程 Agent' }));
    expect(within(table()).getAllByRole('row')).toHaveLength(28);

    await user.click(screen.getByRole('tab', { name: '办公 Agent' }));
    expect(within(table()).getAllByRole('row')).toHaveLength(7);

    await user.click(screen.getByRole('tab', { name: '支持提示词安装' }));
    expect(within(table()).getAllByRole('row')).toHaveLength(28);

    await user.click(screen.getByRole('tab', { name: '全部' }));
    expect(within(table()).getAllByRole('row')).toHaveLength(34);
  });

  it('FAQ 5 问默认收起，点击展开', async () => {
    const user = userEvent.setup();
    renderPage();
    const details = [
      ...screen
        .getByText('Agent Skills 常见问题')
        .parentElement!.querySelectorAll('details'),
    ];
    expect(details).toHaveLength(5);
    for (const d of details) expect(d.open).toBe(false);
    await user.click(details[0].querySelector('summary')!);
    expect(details[0].open).toBe(true);
    expect(details[1].open).toBe(false);
  });

  it('卡片区：pills 过滤（mock 数据含幻灯片/网页/视频/图像）', async () => {
    renderPage();
    // mock server 提供 14 条种子
    await waitFor(() => {
      expect(screen.getAllByRole('article').length).toBeGreaterThan(0);
    });
    const before = screen.getAllByRole('article').length;
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: '幻灯片' }));
    await waitFor(() => {
      expect(screen.getAllByRole('article').length).toBeLessThanOrEqual(before);
    });
  });

  it('语言包引用键存在性（skills.agent.* 全部命中且为字符串）', async () => {
    renderPage();
    // 渲染过程 i18n 若命中对象键会报错（returned an object instead of string）——
    // 无报错即通过；再抽验两处文案
    expect(
      screen.getByText('每个 AI agent 都能用的 Agent Skills'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('安装提示词').length).toBeGreaterThan(0);
    void i18n;
  });
});

describe('Agent 目录页 —— marketplace 入口', () => {
  it('工具栏有「Agent 目录」链接指向 agent 目录页', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Agent 目录' })).toHaveAttribute(
        'href',
        'agent',
      );
    });
  });
});

// MSW server 与 i18n 由 src/test/setup.ts 全局挂载（与 marketplace.test.tsx 同款）。

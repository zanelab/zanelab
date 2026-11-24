import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { server } from '../mocks/server';
import { resetSkillMock, __getRawSkillRows } from '../mocks/skill-handlers';
import { skillsApi, type SkillInput } from './skills';
import { http, HttpResponse } from 'msw';

// MSW 生命周期由 src/test/setup.ts 统一管理（listen/resetHandlers/close）；
// 这里只做每用例后的 mock 数据复位。

afterEach(() => {
  resetSkillMock();
});

const AUTH = (who: 'admin' | 'editor' | undefined) => ({
  headers: authHeaders(who),
});

function authHeaders(
  who: 'admin' | 'editor' | undefined,
): Record<string, string> {
  const h: Record<string, string> = {};
  if (who) h.authorization = `Bearer mock-${who}`;
  return h;
}

/**
 * api 层经 utils/http.ts → getProps().http：测试里没有 qiankun props，
 * 本地 RequestClient 是实际通道；本地客户端只在 localStorage 有 token 时注入
 * Bearer（独立态会话）。需要身份语义的用例直接 server.use 覆写注入头。
 */
beforeEach(() => {
  localStorage.removeItem('iam_token');
});

describe('skillsApi.list（匿名可调，公开读）', () => {
  it('返回种子全量（14 条，与 0002 种子同源）；字段归一 camelCase', async () => {
    const rows = await skillsApi.list();
    expect(rows).toHaveLength(14);
    expect(rows[0].title).toBe('薄荷暗夜软件产品官网');
    // snake→camel 归一：outputTypes / createdAt / updatedAt
    expect(rows[0].outputTypes).toEqual(['网页']);
    expect(rows[0].updatedAt).toContain('2026-11-10');
    expect(rows.every((r) => typeof r.id === 'number')).toBe(true);
  });

  it('写 401/403 不影响读——无 token 也能拉列表', async () => {
    const rows = await skillsApi.list();
    expect(rows.length).toBeGreaterThan(0);
  });
});

describe('skillsApi.get', () => {
  it('命中返回单条；404 msg 透出', async () => {
    const row = await skillsApi.get(1);
    expect(row.title).toBe('薄荷暗夜软件产品官网');

    await expect(skillsApi.get(99999)).rejects.toThrow('技能不存在');
  });
});

describe('skillsApi 写操作（经本地客户端，localStorage 注入身份）', () => {
  const input: SkillInput = {
    title: '测试技能',
    free: true,
    featured: false,
    outputTypes: ['网页'],
    roles: ['设计师'],
    scenes: ['品牌建立与视觉规范'],
    downloads: 0,
    bookmarks: 0,
    rating: 4,
    tone: 'primary',
    agents: ['CC'],
  };

  it('create（admin token）→ 落库并读回；list 可见', async () => {
    localStorage.setItem('iam_token', 'mock-admin');
    const created = await skillsApi.create(input);
    expect(created.id).toBeGreaterThan(0);
    expect(created.title).toBe('测试技能');
    const rows = await skillsApi.list();
    expect(rows.some((r) => r.id === created.id)).toBe(true);
    localStorage.removeItem('iam_token');
  });

  it('create（skills-editor token）→ 放行（有写码非 admin）', async () => {
    localStorage.setItem('iam_token', 'mock-skills-editor');
    const created = await skillsApi.create(input);
    expect(created.id).toBeGreaterThan(0);
    localStorage.removeItem('iam_token');
  });

  it('create（无 token）→ 401 msg 透出', async () => {
    await expect(skillsApi.create(input)).rejects.toThrow('请先登录');
  });

  it('create（无写码身份）→ 403 msg 透出', async () => {
    // mock 身份表里 guest 无 skills 写码——覆写 handler 模拟「登录但无码」
    server.use(
      http.post('*/functions/v1/skills/skills', () =>
        HttpResponse.json(
          { code: 1011, data: null, msg: '没有执行此操作的权限' },
          { status: 403 },
        ),
      ),
    );
    localStorage.setItem('iam_token', 'mock-guest');
    await expect(skillsApi.create(input)).rejects.toThrow(
      '没有执行此操作的权限',
    );
    localStorage.removeItem('iam_token');
  });

  it('update → 字段落库 + updatedAt 刷新；remove → list 不再含该行', async () => {
    localStorage.setItem('iam_token', 'mock-admin');
    const created = await skillsApi.create(input);
    const before = created.updatedAt;
    const updated = await skillsApi.update(created.id, {
      title: '测试技能（改）',
    });
    expect(updated.title).toBe('测试技能（改）');
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(before).getTime(),
    );

    await skillsApi.remove(created.id);
    const rows = await skillsApi.list();
    expect(rows.some((r) => r.id === created.id)).toBe(false);
    localStorage.removeItem('iam_token');
  });

  it('update/remove 不存在的 id → 404 msg 透出', async () => {
    localStorage.setItem('iam_token', 'mock-admin');
    await expect(skillsApi.update(99999, { title: 'x' })).rejects.toThrow(
      '技能不存在',
    );
    await expect(skillsApi.remove(99999)).rejects.toThrow('技能不存在');
    localStorage.removeItem('iam_token');
  });
});

describe('校验语义（镜像 Edge Fn 1014）', () => {
  const input: SkillInput = {
    title: '校验技能',
    free: true,
    featured: false,
    outputTypes: ['网页'],
    roles: ['设计师'],
    scenes: ['品牌建立与视觉规范'],
    downloads: 0,
    bookmarks: 0,
    rating: 4,
    tone: 'primary',
    agents: ['CC'],
  };

  beforeEach(() => {
    localStorage.setItem('iam_token', 'mock-admin');
  });
  afterEach(() => {
    localStorage.removeItem('iam_token');
  });

  it('create 缺 title → 1014；rating 越界 → 1014；tone 非法 → 1014', async () => {
    const { title: _t, ...noTitle } = input;
    await expect(skillsApi.create(noTitle)).rejects.toThrow();
    await expect(skillsApi.create({ ...input, rating: 6 })).rejects.toThrow();
    await expect(
      skillsApi.create({ ...input, tone: 'purple' }),
    ).rejects.toThrow();
  });
});

// AUTH 封装保留（身份语义用例经 localStorage 注入；覆写用例直接 server.use）
void AUTH;

// ==================== 详情页字段 + i18n 回落（任务 11-24-skills-detail-schema） ====================

describe('详情页字段契约（11-24）', () => {
  beforeEach(() => {
    localStorage.setItem('iam_token', 'mock-admin');
  });
  afterEach(() => {
    localStorage.removeItem('iam_token');
  });

  it('列表返回基线内容（不 join 副表——有 en 译文时仍是基线标题）', async () => {
    const rows = await skillsApi.list();
    expect(rows[0].title).toBe('薄荷暗夜软件产品官网');
  });

  it('详情带 locale=en-US → 命中副表译文；不带 locale → 基线', async () => {
    const translated = await skillsApi.get(1, 'en-US');
    expect(translated.title).toBe('Mint Noir SaaS Site');
    expect(translated.taskExpression).toBe(
      'Use this Skill to build landing page.',
    );

    const base = await skillsApi.get(1);
    expect(base.title).toBe('薄荷暗夜软件产品官网');
  });

  it('详情带未命中 locale（如 ja）→ 回落基线标题', async () => {
    const row = await skillsApi.get(1, 'ja');
    expect(row.title).toBe('薄荷暗夜软件产品官网');
  });

  it('create 带详情页字段 → 落库结构与输入一致（JSONB 列整体赋值 + camel→snake 映射）', async () => {
    const created = await skillsApi.create({
      title: '详情技能',
      version: '2.1.0',
      taskExpression: '制作视频',
      summary: '摘要',
      description: '描述',
      priceKind: 'requires_key',
      priceNote: 'Needs FAL_KEY',
      requiresApiKey: ['FAL_KEY'],
      score: 4.5,
      reviewsCount: 12,
      media: [{ kind: 'video', url: 'https://x/y.webp' }],
      deliverables: ['交付一', '交付二'],
      goodFit: ['适合团队'],
      notFor: ['不适合个人'],
      requirements: { bring: ['素材'], lastTested: 'v2.1.0 — Claude Code' },
      tags: {
        scenarios: ['web-design'],
        tasks: ['build-landing-page'],
        styles: ['Bento Grid'],
      },
      generatesWith: ['Claude Fable 5.2 (Anthropic)'],
      usesTools: ['ChatCut'],
    });
    expect(created.version).toBe('2.1.0');
    expect(created.priceKind).toBe('requires_key');
    expect(created.requiresApiKey).toEqual(['FAL_KEY']);
    expect(created.score).toBe(4.5);
    expect(created.reviewsCount).toBe(12);
    expect(created.media?.[0]).toEqual({
      kind: 'video',
      url: 'https://x/y.webp',
    });
    expect(created.deliverables).toEqual(['交付一', '交付二']);
    expect(created.tags?.scenarios).toEqual(['web-design']);
    expect(created.tags?.styles).toEqual(['Bento Grid']);
    expect(created.generatesWith).toEqual(['Claude Fable 5.2 (Anthropic)']);
    expect(created.requirements?.lastTested).toBe('v2.1.0 — Claude Code');
  });

  it('create 带 i18n 载荷 → 副表写入；详情按该 locale 返回译文', async () => {
    const created = await skillsApi.create({
      title: '基线标题',
      i18n: { 'en-US': { title: 'English Title', summary: 'EN summary' } },
    });
    const translated = await skillsApi.get(created.id, 'en-US');
    expect(translated.title).toBe('English Title');
    expect(translated.summary).toBe('EN summary');
    // 未填的字段回落基线
    expect(translated.description).toBe('');
  });
});

describe('写路径 snake 列名契约（11-24：mock 映射必须与 fn 一致）', () => {
  beforeEach(() => {
    localStorage.setItem('iam_token', 'mock-admin');
  });
  afterEach(() => {
    localStorage.removeItem('iam_token');
  });

  it('camel 入参落库为 snake 列（无 camel 列名残留）', async () => {
    await skillsApi.create({
      title: '列名检查',
      taskExpression: '用途句',
      priceNote: 'Needs KEY',
      tryOnlineUrl: 'https://demo',
      requiresApiKey: ['KEY'],
      generatesWith: ['Model'],
      usesTools: ['Tool'],
      goodFit: ['适合'],
      notFor: ['不适合'],
    });
    const created = __getRawSkillRows()[0];
    expect(created.task_expression).toBe('用途句');
    expect(created.price_note).toBe('Needs KEY');
    expect(created.try_online_url).toBe('https://demo');
    expect(created.requires_api_key).toEqual(['KEY']);
    expect(created.generates_with).toEqual(['Model']);
    expect(created.uses_tools).toEqual(['Tool']);
    expect(created.good_fit).toEqual(['适合']);
    expect(created.not_for).toEqual(['不适合']);
    // 无 camel 列名残留
    expect(Object.keys(created)).not.toContain('taskExpression');
    expect(Object.keys(created)).not.toContain('priceNote');
    expect(Object.keys(created)).not.toContain('tryOnlineUrl');
  });
});

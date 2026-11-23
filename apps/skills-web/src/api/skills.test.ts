import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { server } from '../mocks/server';
import { resetSkillMock } from '../mocks/skill-handlers';
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

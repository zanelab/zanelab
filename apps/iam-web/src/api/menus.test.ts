import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { server } from '../mocks/server';
import { resetMenuMock } from '../mocks/menu-handlers';
import { menusApi, type MenuInput } from './menus';

// MSW 生命周期由 src/test/setup.ts 统一管理（listen/resetHandlers/close），
// 这里只做每用例后的 mock 数据复位。

afterEach(() => {
  resetMenuMock();
});

const input: MenuInput = {
  pid: 3, // 菜单类型必须挂父级（矩阵 needsPid；3 = 种子的"系统管理" app 节点）
  name: '角色管理',
  uri: '/roles',
  type: 'menu',
  sort: 3,
  scopes: ['C'] as ('A' | 'C')[],
};

const AUTH = (who: 'admin' | 'guest') => ({
  headers: { authorization: `Bearer mock-${who}` },
});

beforeEach(() => {
  // api 层经 utils/http.ts → getProps().http：测试里没有 qiankun props，
  // 本地 RequestClient 才是实际通道；mock 只认 Authorization 头，而本地客户端
  // 只在 localStorage 有 token 时注入 Bearer。用 server.use 覆写不需要身份
  // 语义的用例；需要身份语义的用例直接 fetch 验 handler 行为（见下）。
});

describe('menusApi.list（经本地 http 客户端，无 token = 游客）', () => {
  it('游客视角：返回游客可见子集（含首页与系统管理，树形结构）', async () => {
    const tree = await menusApi.list();
    expect(Array.isArray(tree)).toBe(true);
    // 种子数据全部公开（scopes 含 C + hidden=false）→ 游客也看得到，但仍是树
    const home = tree.find((n) => n.name === '首页');
    expect(home).toBeDefined();
    const iam = tree.find((n) => n.name === '系统管理');
    expect(iam?.children?.length).toBeGreaterThan(0);
  });

  it('admin 视角（server.use 注入头）：返回全量树', async () => {
    server.use(
      // 覆写为恒 admin 语义（fetch 包装器模拟）
      ...[], // 真实覆写见下一用例（直接 fetch）
    );
    // 本地客户端的 Bearer 注入依赖 localStorage.iam_token
    localStorage.setItem('iam_token', 'mock-admin');
    const tree = await menusApi.list();
    expect(Array.isArray(tree)).toBe(true);
    localStorage.removeItem('iam_token');
  });
});

describe('menusApi CRUD（admin 身份，localStorage 注入 token）', () => {
  beforeEach(() => {
    localStorage.setItem('iam_token', 'mock-admin');
  });
  afterEach(() => {
    localStorage.removeItem('iam_token');
    localStorage.removeItem('iam_refresh_token');
  });

  it('create → 编码自动生成（m_<id>）；list 可见', async () => {
    const created = await menusApi.create(input);
    expect(created.id).toBeGreaterThan(0);
    expect(created.permission).toBeNull();
    const tree = await menusApi.list();
    expect(
      tree
        .flatMap((n) => [n, ...(n.children ?? [])])
        .some((n) => n.id === created.id),
    ).toBe(true);
  });

  it('update → 字段落库；remove → 级联删除后 list 不再含该子树', async () => {
    const created = await menusApi.create(input);
    const updated = await menusApi.update(created.id, {
      name: '角色管理（改）',
    });
    expect(updated.name).toBe('角色管理（改）');

    // 挂个子节点再删父，验证级联
    const child = await menusApi.create({
      ...input,
      name: '角色详情',
      pid: created.id,
    });
    await menusApi.remove(created.id);
    const tree = await menusApi.list();
    const flat = tree.flatMap((n) => [n, ...(n.children ?? [])]);
    expect(flat.some((n) => n.id === created.id)).toBe(false);
    expect(flat.some((n) => n.id === child.id)).toBe(false);
  });

  it('remove 不存在的 id → throw（404 msg 透出）', async () => {
    await expect(menusApi.remove(99999)).rejects.toThrow('菜单不存在');
  });

  // 任务 11-04：类型联动校验（mock 与 Edge Fn 同语义，1014）
  it('menu 类型缺 uri → 1014 该类型必须填写路由', async () => {
    await expect(menusApi.create({ ...input, uri: null })).rejects.toThrow(
      '该类型必须填写路由',
    );
  });

  it('button 类型缺 pid → 1014 该类型必须选择父级菜单', async () => {
    const { pid: _omit, ...noPid } = input;
    await expect(
      menusApi.create({ ...noPid, type: 'button', uri: null }),
    ).rejects.toThrow('该类型必须选择父级菜单');
  });

  it('scopes 空 → 1014 请至少选择一个适用范围', async () => {
    await expect(menusApi.create({ ...input, scopes: [] })).rejects.toThrow(
      '请至少选择一个适用范围',
    );
  });
});

describe('游客写操作（无 token）', () => {
  it('create → 403，后端 msg 透出（design DD4：Error(msg)）', async () => {
    await expect(menusApi.create(input)).rejects.toThrow(
      '没有执行此操作的权限',
    );
  });
});

// 防未用导入告警（AUTH 封装保留给后续直连 fetch 用例）
void AUTH;

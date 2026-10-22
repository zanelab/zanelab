import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchMenusMock } = vi.hoisted(() => ({ fetchMenusMock: vi.fn() }));

vi.mock('../api/menu', () => ({ fetchMenus: fetchMenusMock }));

import { appConfig } from '../config';
import {
  X_ORG,
  X_ORG_ID,
  X_PLATFORM,
  X_TENANT,
  X_TENANT_ID,
  SystemType,
} from '../constants/auth';
import type { UserOrgVO, UserTenantPerVO } from '../stores/session-store';
import { useMenuStore } from '../stores/menu-store';
import { cache } from '@zanelab/utils';
import {
  switchOrg,
  switchToBusiness,
  switchToPlatform,
  switchTenant,
} from './session';

const END_KEYS = [X_PLATFORM, X_TENANT, X_TENANT_ID, X_ORG, X_ORG_ID];

const MENUS_FIRST = '/p/first';
const menusFixture = [
  { id: 1, name: '空间首页', path: MENUS_FIRST, component: 'demo/button' },
  { id: 2, name: '系统管理', path: '/p/second', component: 'demo/table' },
];

const tenantFixture: UserTenantPerVO = {
  tenantId: 5,
  tenantCode: 'j38345',
  tenantName: '测试数据',
  isDefault: false,
  isPerm: true,
  orgList: [],
  username: 'xiaoxiao',
};

const orgFixture: UserOrgVO = {
  orgId: 8,
  orgCode: 'j38345',
  orgName: 'default',
  isDefault: true,
};

beforeEach(() => {
  fetchMenusMock.mockReset();
  END_KEYS.forEach((key) => cache.remove(key));

  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { href: '' },
  });
});

describe('switchToPlatform（切平台管理端）', () => {
  it('清租户/空间 → 设 -P → 重新拉菜单并跳第一条可导航路径', async () => {
    cache.set(X_TENANT, 'j38345');
    cache.set(X_TENANT_ID, 5);
    cache.set(X_ORG, 'totti5');
    cache.set(X_ORG_ID, 12);
    fetchMenusMock.mockResolvedValue(menusFixture);

    switchToPlatform();

    expect(cache.get(X_PLATFORM)).toBe(SystemType.PLATFORM);
    expect(cache.get(X_TENANT)).toBeNull();
    expect(cache.get(X_TENANT_ID)).toBeNull();
    expect(cache.get(X_ORG)).toBeNull();
    expect(cache.get(X_ORG_ID)).toBeNull();

    await vi.waitFor(() => expect(window.location.href).toBe(MENUS_FIRST));
    expect(fetchMenusMock).toHaveBeenCalledTimes(1);
    expect(useMenuStore.getState().menus).toHaveLength(2);
  });

  it('菜单为空/拉取失败 → 回退 homePath（不会卡在原页面）', async () => {
    fetchMenusMock.mockResolvedValue([]);
    switchToPlatform();
    await vi.waitFor(() =>
      expect(window.location.href).toBe(appConfig.route.homePath),
    );
  });
});

describe('switchToBusiness（切项目空间）', () => {
  it('设 -O + 租户 + 空间 → 重新拉菜单并跳第一条', async () => {
    fetchMenusMock.mockResolvedValue(menusFixture);

    switchToBusiness(tenantFixture, orgFixture);

    expect(cache.get(X_PLATFORM)).toBe(SystemType.ORG);
    expect(cache.get(X_TENANT)).toBe('j38345');
    expect(cache.get(X_TENANT_ID)).toBe(5);
    expect(cache.get(X_ORG)).toBe('j38345');
    expect(cache.get(X_ORG_ID)).toBe(8);

    await vi.waitFor(() => expect(window.location.href).toBe(MENUS_FIRST));
  });

  it('switchOrg（同租户内切空间）复用同一链路：也落到新空间菜单第一条', async () => {
    fetchMenusMock.mockResolvedValue(menusFixture);

    switchOrg({ ...orgFixture, orgId: 12, orgCode: 'totti5' }, tenantFixture);

    expect(cache.get(X_ORG)).toBe('totti5');
    await vi.waitFor(() => expect(window.location.href).toBe(MENUS_FIRST));
  });

  it('switchTenant：租户有空间 → 进第一个空间并跳其菜单第一条', async () => {
    fetchMenusMock.mockResolvedValue(menusFixture);

    switchTenant({ ...tenantFixture, orgList: [orgFixture] });

    expect(cache.get(X_PLATFORM)).toBe(SystemType.ORG);
    expect(cache.get(X_ORG)).toBe('j38345');
    await vi.waitFor(() => expect(window.location.href).toBe(MENUS_FIRST));
  });

  it('switchTenant：租户无空间 → 进租户端并跳其菜单第一条', async () => {
    fetchMenusMock.mockResolvedValue(menusFixture);

    switchTenant(tenantFixture);

    expect(cache.get(X_PLATFORM)).toBe(SystemType.TENANT);
    expect(cache.get(X_ORG)).toBeNull();
    await vi.waitFor(() => expect(window.location.href).toBe(MENUS_FIRST));
  });
});

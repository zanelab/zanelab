import { beforeEach, describe, expect, it } from 'vitest';
import {
  getCurrentOrg,
  getCurrentTenant,
  isCachedEndUsable,
  isSameOrg,
  pickDefaultEnd,
  pickPermittedTenant,
  type UserOrgVO,
  type UserPerVO,
  type UserTenantPerVO,
} from './session-store';
import { cache } from '@zanelab/utils';
import {
  X_ORG,
  X_ORG_ID,
  X_PLATFORM,
  X_TENANT,
  X_TENANT_ID,
  SystemType,
} from '../constants/auth';

const orgs: UserOrgVO[] = [
  { orgId: 1, orgCode: 'org-a', orgName: '空间A', isDefault: true },
  { orgId: 2, orgCode: 'org-b', orgName: '空间B', isDefault: false },
  { orgId: 3, orgCode: 'org-c', orgName: '空间C', isDefault: false },
  { orgId: 4, orgCode: 'org-d', orgName: '空间D', isDefault: false },
];

const tenant: UserTenantPerVO = {
  tenantId: 1,
  tenantCode: 't1',
  tenantName: '租户1',
  isDefault: true,
  isPerm: true,
  orgList: orgs,
  username: 'u',
};

describe('isSameOrg', () => {
  it('引用相等即同一空间（getCurrentOrg 从同一 orgList 选出）', () => {
    expect(isSameOrg(orgs[1], orgs[1])).toBe(true);
  });

  it('orgCode 相同即同一空间（不同对象）', () => {
    expect(isSameOrg(orgs[0], { ...orgs[0] })).toBe(true);
  });

  it('不同空间返回 false', () => {
    expect(isSameOrg(orgs[0], orgs[1])).toBe(false);
  });

  it('字段缺失（orgCode 空串、orgId 缺失）时不误判：只有同一引用算当前项', () => {
    const noCode = [
      { orgCode: '', orgName: 'A', isDefault: true },
      { orgCode: '', orgName: 'B', isDefault: false },
      { orgCode: '', orgName: 'C', isDefault: false },
      { orgCode: '', orgName: 'D', isDefault: false },
    ] as unknown as UserOrgVO[];

    const highlighted = noCode.filter((o) => isSameOrg(noCode[0], o));
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0].orgName).toBe('A');
  });

  it('orgId 重复时不按 orgId 判身份：只有引用命中的那一条算当前项', () => {
    const dup = [
      { orgId: 1, orgCode: '', orgName: 'A', isDefault: true },
      { orgId: 1, orgCode: '', orgName: 'B', isDefault: false },
      { orgId: 1, orgCode: '', orgName: 'C', isDefault: false },
      { orgId: 1, orgCode: '', orgName: 'D', isDefault: false },
    ] as unknown as UserOrgVO[];

    const highlighted = dup.filter((o) => isSameOrg(dup[0], o));
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0].orgName).toBe('A');
  });

  it('入参为空返回 false', () => {
    expect(isSameOrg(undefined, orgs[0])).toBe(false);
    expect(isSameOrg(orgs[0], undefined)).toBe(false);
  });
});

describe('getCurrentOrg（X-Org 命中 → isDefault → 第一个）', () => {
  beforeEach(() => {
    cache.remove(X_ORG);
    cache.remove(X_TENANT);
  });

  it('无缓存时取 isDefault 空间', () => {
    expect(getCurrentOrg(tenant)?.orgCode).toBe('org-a');
  });

  it('缓存命中时取缓存指向的空间', () => {
    cache.set(X_ORG, 'org-c');
    expect(getCurrentOrg(tenant)?.orgCode).toBe('org-c');
  });

  it('无 orgList 时返回 undefined', () => {
    expect(getCurrentOrg(undefined)).toBeUndefined();
  });

  it('getCurrentTenant 无缓存时取 isDefault 租户', () => {
    expect(getCurrentTenant([tenant])?.tenantCode).toBe('t1');
  });
});

const placeholderTenant: UserTenantPerVO = {
  tenantId: 2,
  tenantCode: 't00001',
  tenantName: 'default',
  isDefault: false,
  isPerm: false,
  orgList: [],
  username: 'xiaoxiao',
};

const permittedNoOrgTenant: UserTenantPerVO = {
  tenantId: 4,
  tenantCode: 'no-org',
  tenantName: '有权限无空间',
  isDefault: false,
  isPerm: true,
  orgList: [],
  username: 'xiaoxiao',
};

const permittedTenant: UserTenantPerVO = {
  tenantId: 5,
  tenantCode: 'j38345',
  tenantName: '测试数据',
  isDefault: false,
  isPerm: true,
  orgList: [
    {
      orgId: 8,
      orgCode: 'j38345',
      orgName: 'default',
      isDefault: false,
      desc: '323',
    },
    { orgId: 12, orgCode: 'totti5', orgName: 'totti5', isDefault: false },
  ],
  username: 'xiaoxiao',
};

function userPer(tenantList: UserTenantPerVO[], isPlatform = true): UserPerVO {
  return { isPlatform, tenantList };
}

function clearEndCache() {
  [X_PLATFORM, X_TENANT, X_TENANT_ID, X_ORG, X_ORG_ID].forEach((k) =>
    cache.remove(k),
  );
}

describe('pickPermittedTenant / pickDefaultEnd', () => {
  beforeEach(clearEndCache);

  it('只认 isPerm=true；全是占位租户时返回 undefined', () => {
    expect(pickPermittedTenant([placeholderTenant])).toBeUndefined();
    expect(pickPermittedTenant([])).toBeUndefined();
  });

  it('isPerm 里优先 isDefault，其次首个带空间的，再次第一个', () => {
    const defaultPermitted = {
      ...permittedNoOrgTenant,
      tenantId: 9,
      isDefault: true,
    };
    expect(
      pickPermittedTenant([permittedTenant, defaultPermitted])?.tenantId,
    ).toBe(9);
    expect(
      pickPermittedTenant([permittedNoOrgTenant, permittedTenant])?.tenantId,
    ).toBe(5);
    expect(pickPermittedTenant([permittedNoOrgTenant])?.tenantId).toBe(4);
  });

  it('真实数据形态：跳过首条占位租户，进有权限租户的空间端（-O）', () => {
    const end = pickDefaultEnd(
      userPer([placeholderTenant, permittedTenant], true),
    );
    expect(end.platform).toBe(SystemType.ORG);
    expect(end.tenant?.tenantCode).toBe('j38345');

    expect(end.org?.orgCode).toBe('j38345');
  });

  it('有权限租户无空间 → 租户端（-T）', () => {
    const end = pickDefaultEnd(
      userPer([placeholderTenant, permittedNoOrgTenant]),
    );
    expect(end.platform).toBe(SystemType.TENANT);
    expect(end.tenant?.tenantCode).toBe('no-org');
    expect(end.org).toBeUndefined();
  });

  it('无任何有权限租户：平台管理员退到平台端（-P）', () => {
    expect(pickDefaultEnd(userPer([placeholderTenant], true)).platform).toBe(
      SystemType.PLATFORM,
    );
    expect(pickDefaultEnd(userPer([], true)).platform).toBe(
      SystemType.PLATFORM,
    );
  });

  it('无任何有权限租户且非平台管理员：保持老行为（第一条 + -T）', () => {
    const end = pickDefaultEnd(userPer([placeholderTenant], false));
    expect(end.platform).toBe(SystemType.TENANT);
    expect(end.tenant?.tenantCode).toBe('t00001');
  });

  it('重选后的端标识必然通过 isCachedEndUsable（写完 cache 的自洽性）', () => {
    const list = userPer([placeholderTenant, permittedTenant], true);
    const { platform, tenant, org } = pickDefaultEnd(list);
    cache.set(X_PLATFORM, platform);
    if (tenant) {
      cache.set(X_TENANT, tenant.tenantCode);
      cache.set(X_TENANT_ID, tenant.tenantId);
    }
    if (org) {
      cache.set(X_ORG, org.orgCode);
      cache.set(X_ORG_ID, org.orgId);
    }
    expect(isCachedEndUsable(list)).toBe(true);
  });
});

describe('isCachedEndUsable（缓存端标识仍可用？）', () => {
  beforeEach(clearEndCache);

  const list = userPer(
    [placeholderTenant, permittedNoOrgTenant, permittedTenant],
    true,
  );

  it('无端标识 → false（走首次进端重选）', () => {
    expect(isCachedEndUsable(list)).toBe(false);
  });

  it('平台端（-P）无需租户，直接可用', () => {
    cache.set(X_PLATFORM, SystemType.PLATFORM);
    expect(isCachedEndUsable(list)).toBe(true);
  });

  it('脏值：占位租户 t00001（isPerm=false）→ false，即使 X-Platform 有值', () => {
    cache.set(X_PLATFORM, SystemType.TENANT);
    cache.set(X_TENANT, 't00001');
    cache.set(X_TENANT_ID, 2);
    expect(isCachedEndUsable(list)).toBe(false);
  });

  it('用户主动切换过的有权限租户（-T）→ true', () => {
    cache.set(X_PLATFORM, SystemType.TENANT);
    cache.set(X_TENANT, 'j38345');
    expect(isCachedEndUsable(list)).toBe(true);
  });

  it('空间端（-O）：空间存在 → true，空间已不在该租户下 → false', () => {
    cache.set(X_PLATFORM, SystemType.ORG);
    cache.set(X_TENANT, 'j38345');
    cache.set(X_ORG, 'totti5');
    expect(isCachedEndUsable(list)).toBe(true);

    cache.set(X_ORG, 'org-removed');
    expect(isCachedEndUsable(list)).toBe(false);
  });

  it('租户已不在 tenantList（失权/被移除）→ false', () => {
    cache.set(X_PLATFORM, SystemType.ORG);
    cache.set(X_TENANT, 'tottia');
    cache.set(X_ORG, 'tottia');
    expect(isCachedEndUsable(list)).toBe(false);
  });

  it('端标识取值异常（非 -P/-T/-O）→ false，按重选处理', () => {
    cache.set(X_PLATFORM, '-X');
    cache.set(X_TENANT, 'j38345');
    expect(isCachedEndUsable(list)).toBe(false);
  });
});

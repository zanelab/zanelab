import http from '../utils/http';
import { appConfig } from '../config';
import type { MenuItem } from '../types';

interface RawMenuItem {
  id: number;
  pid: number;
  code: string;
  parent: string;
  name: string;
  component: string;
  uri: string | null;
  type: 'app' | 'menu' | 'button' | 'group';
  sort: number;
  icon: string | null;
  hidden: boolean;
  scopes: string[];
  menuType: number;
  children?: RawMenuItem[] | null;
}

function collectAppBases(rawMenus: RawMenuItem[]): Set<string> {
  const bases = new Set<string>();
  const add = (value?: string | null) => {
    const base = (value || '').replace(/^\/+/, '').split('/')[0];
    if (base) bases.add(base);
  };
  for (const raw of rawMenus) {
    if (raw.type === 'app') add(raw.uri || raw.component);
  }
  for (const [name, cfg] of Object.entries(appConfig.microApps)) {
    add(name);
    add(cfg.activeRule);
  }
  return bases;
}

function firstSegment(uri: string | null | undefined): string {
  if (!uri) return '';
  return uri.replace(/^\/+/, '').split('/')[0];
}

function isAbsoluteUri(
  uri: string | null | undefined,
  appBases: Set<string>,
): boolean {
  if (!uri || !uri.startsWith('/')) return false;
  return appBases.has(firstSegment(uri));
}

function isVirtualGroupApp(raw: RawMenuItem, appBases: Set<string>): boolean {
  if (raw.type !== 'app' || raw.uri) return false;
  const ownBase = firstSegment(raw.component);
  return (raw.children || []).some((child) => {
    const segment = firstSegment(child.uri);
    return segment !== '' && segment !== ownBase && appBases.has(segment);
  });
}

function transformMenu(
  raw: RawMenuItem,
  appPrefix: string,
  appBases: Set<string>,
  noPrefix = false,
): MenuItem | null {
  if (raw.type === 'button') {
    return {
      id: raw.id,
      name: raw.name,
      path: '',
      permission: raw.uri || raw.code || undefined,
    };
  }

  const uri = raw.uri || '';
  let path: string;
  let appName: string | undefined;

  if (raw.type === 'app') {
    const appNameVal = raw.component || raw.uri || raw.name;
    appName = appNameVal;
    path = `/${appNameVal}`;
  } else {
    const normalized = uri.startsWith('/') ? uri : `/${uri}`;

    const duplicated =
      appPrefix !== '' && normalized.startsWith(`${appPrefix}/`);
    path =
      noPrefix || isAbsoluteUri(uri, appBases) || duplicated
        ? normalized
        : `${appPrefix}${normalized}`;
    appName = appPrefix.slice(1) || undefined;
  }

  const item: MenuItem = {
    id: raw.id,
    name: raw.name,
    path,
    icon: raw.icon || undefined,
    appName,

    type: raw.type,
  };

  if (
    raw.type === 'menu' &&
    raw.component &&
    !raw.component.startsWith('/') &&
    !/^[A-Z_]+$/.test(raw.component)
  ) {
    item.component = raw.component;
  }

  if (raw.children?.length) {
    const childPrefix = raw.type === 'app' ? path : appPrefix;
    item.children = raw.children
      .map((child) => transformMenu(child, childPrefix, appBases, noPrefix))
      .filter((c): c is MenuItem => c !== null);
    if (item.children.length === 0) {
      delete item.children;
    }
  }

  return item;
}

export async function fetchMenus(): Promise<MenuItem[]> {
  const rawMenus = (await http.get(
    appConfig.api.menusEndpoint,
  )) as unknown as RawMenuItem[];
  if (!Array.isArray(rawMenus)) return [];

  const appBases = collectAppBases(rawMenus);

  return rawMenus
    .map((raw) => {
      const virtualGroup = isVirtualGroupApp(raw, appBases);
      const item = transformMenu(raw, '', appBases, virtualGroup);
      if (!item) return null;

      if (virtualGroup) {
        item.appName = undefined;
      }

      return item;
    })
    .filter((m): m is MenuItem => m !== null);
}

import type { ReactNode } from 'react';
export interface RouteMetaInfo {
  path: string;

  activePath?: string;
  affixTab?: boolean;
  affixTabOrder?: number;

  hideChildrenInMenu?: boolean;

  hideInBreadcrumb?: boolean;
  hideInMenu?: boolean;
  hideInTab?: boolean;

  icon?: ReactNode;

  domCached?: boolean;
  iframeSrc?: string;
  keepAlive?: boolean;
  link?: string;
  maxNumOfOpenTab?: number;
  openInNewWindow?: boolean;

  query?: Record<string, unknown>;

  i18nKey?: string;

  tabClosable?: boolean;
  title?: string;

  fullPathKey?: boolean;
}

const routeMetaMap = new Map<string, RouteMetaInfo>();

export function registerRoutes(items: RouteMetaInfo[]) {
  for (const item of items) {
    routeMetaMap.set(item.path, item);
  }
}

export function getRouteMeta(path: string): RouteMetaInfo | undefined {
  return routeMetaMap.get(path);
}

export function getMatchedRouteMetas(path: string): RouteMetaInfo[] {
  const segments = path.split('/').filter(Boolean);
  const result: RouteMetaInfo[] = [];
  let current = '';
  for (const segment of segments) {
    current = `${current}/${segment}`;
    const meta = routeMetaMap.get(current);
    if (meta) {
      result.push(meta);
    }
  }
  return result;
}

export function getAffixRoutes(): RouteMetaInfo[] {
  return [...routeMetaMap.values()]
    .filter((route) => !!route.affixTab)
    .toSorted((a, b) => (a.affixTabOrder ?? 0) - (b.affixTabOrder ?? 0));
}

export function getIframeRoutes(): {
  fullPath: string;
  name: string;
  meta: { iframeSrc?: string; keepAlive?: boolean };
}[] {
  return [...routeMetaMap.values()]
    .filter((route) => !!route.iframeSrc)
    .map((route) => ({
      fullPath: route.path,
      name: route.path,
      meta: { iframeSrc: route.iframeSrc, keepAlive: route.keepAlive },
    }));
}

/**
 * 路由元信息注册表 — vue-router route `meta` 的 React 等价物
 * （affixTab / title / keepAlive 等）。上游参考实现 从 router.getRoutes()
 * 读 meta；React Router 的声明式 <Routes> 不携带 meta，
 * 故路由就绪后在此统一注册一次（见 App.tsx）。
 */
import type { ReactNode } from 'react';
export interface RouteMetaInfo {
  path: string;
  /** 激活时的菜单路径（等价于 vue-router meta.activePath） */
  activePath?: string;
  affixTab?: boolean;
  affixTabOrder?: number;
  /** 子菜单隐藏时面包屑也隐藏（等价于 meta.hideChildrenInMenu） */
  hideChildrenInMenu?: boolean;
  /** 在面包屑中隐藏（等价于 vue-router meta.hideInBreadcrumb） */
  hideInBreadcrumb?: boolean;
  hideInMenu?: boolean;
  hideInTab?: boolean;
  /** 图标（等价于 vue-router meta.icon） */
  icon?: ReactNode;
  /** keepAlive DOM 缓存（等价于 vue-router meta.domCached；port 中无 domCached 路由时为冗余字段） */
  domCached?: boolean;
  iframeSrc?: string;
  keepAlive?: boolean;
  link?: string;
  maxNumOfOpenTab?: number;
  openInNewWindow?: boolean;
  /** 跳转时携带的 query（等价于 vue-router meta.query） */
  query?: Record<string, unknown>;
  /**
   * 国际化键（菜单契约下发，09-09-i18n）：title 存原始 name、i18nKey 随契约
   * 注册；消费端（tabbar/面包屑）渲染期经 menuTitle 解析，缺省/未命中回退 title
   */
  i18nKey?: string;
  /** 标签页是否可关闭（等价 vue-router meta.tabClosable） */
  tabClosable?: boolean;
  title?: string;
  /**
   * tab key 是否使用完整路径（含 query）。false 时 key 退化为 path
   * （等价 vue-router meta.fullPathKey，由 getTabKey 消费）
   */
  fullPathKey?: boolean;
}

const routeMetaMap = new Map<string, RouteMetaInfo>();

/** 注册路由元信息（重复注册时覆盖） */
export function registerRoutes(items: RouteMetaInfo[]) {
  for (const item of items) {
    routeMetaMap.set(item.path, item);
  }
}

/** 获取单个路由的元信息 */
export function getRouteMeta(path: string): RouteMetaInfo | undefined {
  return routeMetaMap.get(path);
}

/**
 * 获取路径的匹配链（等价于 vue-router 的 route.matched）：
 * 注册表中所有作为 path 段级前缀祖先的路由，按由浅到深排序。
 * 例如 getMatchedRouteMetas('/docs/api') → ['/docs', '/docs/api']
 */
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

/** 获取所有固定标签页路由（按 affixTabOrder 排序）— 等价于 filterTree(router.getRoutes(), r => !!r.meta?.affixTab) */
export function getAffixRoutes(): RouteMetaInfo[] {
  return [...routeMetaMap.values()]
    .filter((route) => !!route.affixTab)
    .toSorted((a, b) => (a.affixTabOrder ?? 0) - (b.affixTabOrder ?? 0));
}

/** 获取所有 iframe 路由（meta.iframeSrc）— 等价于上游 iframe 布局的 iframe 路由列表 */
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

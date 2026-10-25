import { appConfig } from '../config';
import type { MenuItem } from '../types';
import type { MenuRecordRaw } from '@zanelab/types';
import { menuTitle } from '../locales/i18n';

/**
 * 菜单视图分流（09-08-user-dropdown-menu）：
 * 后端契约的全量菜单只存一份（menuSlice.menus），本模块按渲染目标拆视图——
 * 分流收敛在 App.tsx 装配层，壳组件/路由生成不感知 menuType。
 * 标题经 menuTitle 渲染期解析（09-09-i18n）：i18nKey 命中取翻译，否则回退 name；
 * 本模块在 App 装配层调用（App 加 useTranslation 随语言重渲染，下游纯函数自然重算）。
 */

/**
 * 节点是否产路由（用于 findFirstNavigablePath 判定落点）：
 * - 有 component → host 本地页（懒加载）
 * - appName 存在且 ≠ portal → 子应用路径（elementFor 产占位，或落到
 *   subAppCatchAllRoutes 的 activeRule 兜底——两者均能在路由表匹配到内容）
 *
 * 注：此处不校验 appName 是否在 config.microApps 注册。原因：虚拟分组应用
 * （api/menu.ts isVirtualGroupApp）的子菜单 appName 是父 app 的 component
 * （如 platform_manager），未必等于已注册子应用名，但 path 已是绝对路径
 * （如 /npa-plt-system/admin/role），会命中对应 activeRule 兜底路由。
 * 是否真正落 404 由 generateRoutes.elementFor + 顶层 * 兜底负责（09-14）。
 */
function hasRoute(item: MenuItem): boolean {
  if (item.component) return true;
  return Boolean(item.appName && item.appName !== 'portal');
}

/**
 * 空壳应用根：应用节点自身没有子菜单，且不是已注册子应用（config.microApps）的入口。
 *
 * 后台按租户/空间下发菜单时很常见（如某租户没有任何 agent_flow 页面，仍回一个空的
 * 应用节点）：落上去只有空容器、无内容，应继续找下一个应用。
 */
function isEmptyAppRoot(item: MenuItem): boolean {
  if (item.type !== 'app' || item.children?.length) return false;
  return !appConfig.microApps[item.appName ?? ''];
}

/**
 * 优先落点：按菜单顺序找第一个「有内容」的可导航路径（第一个没有可用菜单就取
 * 第二个，以此类推 —— 切换租户/空间后菜单集可能整体变化）。
 * 跳过 button 权限节点（path 为空），跳过不产路由的节点与空壳应用根；
 * 子菜单全被过滤时（如全是 button 权限节点）父节点自身即页面，取其 path。
 *
 * 例：AgentFlow(app) → 工作台(menu) → 查看(button,无path)
 *   返回 工作台的 path = '/agent_flow/app/list'
 */
function findPreferredPath(menus: MenuItem[]): string | undefined {
  for (const menu of menus) {
    if (!menu.path) continue;
    const usable = hasRoute(menu) && !isEmptyAppRoot(menu);

    // 有 children 时优先下钻找更深层叶子
    if (menu.children?.length) {
      const childPath = findPreferredPath(menu.children);
      if (childPath) return childPath;
      if (usable) return menu.path;
      continue;
    }
    if (usable) return menu.path;
  }
  return undefined;
}

/** 保底落点：全树都取不到「有内容」的路径时，退回第一个有 path 的节点（避免无处可去）。 */
function findAnyPath(menus: MenuItem[]): string | undefined {
  for (const menu of menus) {
    if (menu.path) return menu.path;
    if (menu.children?.length) {
      const childPath = findAnyPath(menu.children);
      if (childPath) return childPath;
    }
  }
  return undefined;
}

/** 深度优先搜索菜单树，找到第一个可导航路径（见 findPreferredPath / findAnyPath）。 */
export function findFirstNavigablePath(menus: MenuItem[]): string | undefined {
  return findPreferredPath(menus) ?? findAnyPath(menus);
}

/**
 * 菜单树中是否存在指定 path 的节点（含子树递归）。
 *
 * 用于区分顶层 `*` 兜底的两种落 404 场景（见 App.NotFoundOrFallback）：
 * - path 在菜单树里：菜单下发了该路径但子应用未注册（elementFor 不产占位路由）
 *   → 真正的"子应用未启动"→ 显示 404，不重定向（09-14）
 * - path 不在菜单树里：切租户/空间后旧 URL 在新菜单集已失效
 *   → 回到第一个可用菜单（保留原设计，避免误判 404）
 */
export function hasMenuPath(menus: MenuItem[], pathname: string): boolean {
  for (const m of menus) {
    if (m.path && m.path === pathname) return true;
    if (m.children?.length && hasMenuPath(m.children, pathname)) return true;
  }
  return false;
}

/** 全量菜单 → 壳菜单（侧边栏/顶栏/全局搜索数据源）：剔除 user-dropdown 子树 + 空 path（button 权限节点） */
export function toShellMenus(menus: MenuItem[]): MenuRecordRaw[] {
  return menus
    .filter((menu) => menu.menuType !== 'user-dropdown' && menu.path)
    .map((menu) => ({
      path: menu.path,
      name: menuTitle(menu),
      icon: menu.icon,
      children: menu.children ? toShellMenus(menu.children) : undefined,
    }))
    .filter((menu) => menu.children?.length || menu.path);
}

/** 用户下拉框菜单项（collectDropdownMenus 的产出，icon 为后端字符串，装配层映射） */
export interface DropdownMenuEntry {
  name: string;
  path: string;
  icon?: string;
  /** 子菜单（多级）：有 children 的项为目录语义（不导航，悬停级联弹出） */
  children?: DropdownMenuEntry[];
}

/** user-dropdown 子树整体转换为 entry 树（子树内层级不再判定 menuType） */
function toEntry(item: MenuItem): DropdownMenuEntry {
  return {
    name: menuTitle(item),
    path: item.path,
    icon: item.icon,
    ...(item.children?.length ? { children: item.children.map(toEntry) } : {}),
  };
}

/**
 * 全量菜单 → 用户下拉框菜单树：收集 menuType === 'user-dropdown' 的顶层节点，
 * 其子树递归保留（父项=目录，叶子=跳转入口）。
 */
export function collectDropdownMenus(menus: MenuItem[]): DropdownMenuEntry[] {
  const result: DropdownMenuEntry[] = [];
  const walk = (list: MenuItem[]) => {
    for (const item of list) {
      if (item.menuType === 'user-dropdown') {
        result.push(toEntry(item));
      } else if (item.children?.length) {
        walk(item.children);
      }
    }
  };
  walk(menus);
  return result;
}

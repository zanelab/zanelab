import { appConfig } from '../config';
import type { MenuItem } from '../types';
import type { MenuRecordRaw } from '@zanelab/types';
import { menuTitle } from '../locales/i18n';

function hasRoute(item: MenuItem): boolean {
  if (item.component) return true;
  return Boolean(item.appName && item.appName !== 'portal');
}

function isEmptyAppRoot(item: MenuItem): boolean {
  if (item.type !== 'app' || item.children?.length) return false;
  return !appConfig.microApps[item.appName ?? ''];
}

function findPreferredPath(menus: MenuItem[]): string | undefined {
  for (const menu of menus) {
    if (!menu.path) continue;
    const usable = hasRoute(menu) && !isEmptyAppRoot(menu);

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

export function findFirstNavigablePath(menus: MenuItem[]): string | undefined {
  return findPreferredPath(menus) ?? findAnyPath(menus);
}

export function hasMenuPath(menus: MenuItem[], pathname: string): boolean {
  for (const m of menus) {
    if (m.path && m.path === pathname) return true;
    if (m.children?.length && hasMenuPath(m.children, pathname)) return true;
  }
  return false;
}

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

export interface DropdownMenuEntry {
  name: string;
  path: string;
  icon?: string;

  children?: DropdownMenuEntry[];
}

function toEntry(item: MenuItem): DropdownMenuEntry {
  return {
    name: menuTitle(item),
    path: item.path,
    icon: item.icon,
    ...(item.children?.length ? { children: item.children.map(toEntry) } : {}),
  };
}

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

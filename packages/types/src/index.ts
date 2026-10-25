// @zanelab/types：跨模块共享业务类型（docs/技术方案.md §4.3、§10）。
/// <reference path="./sm-crypto.d.ts" />

export interface MenuItem {
  id: number;
  name: string; // 菜单名（展示用，含中文；i18nKey 未命中时的回退原文）
  icon?: string;
  path: string;
  appName?: string; // 'portal' / 缺省 = host 本地页；否则 = 子应用注册键（config.microApps）
  permission?: string; // 权限码，如 'system:user:list'
  component?: string; // host 本地页在 src/pages/ 下的相对路径（lazy import）
  /** 国际化键（如 'menus.system.users'）；缺省或语言包未命中时回退 name（09-09-i18n） */
  i18nKey?: string;

  /**
   * 菜单渲染目标：缺省/'normal' = 侧边栏/顶栏导航；
   * 'user-dropdown' = 用户下拉框自定义菜单（children 递归消费，支持多级：
   * 有 children 的项为目录语义——悬停级联弹出子菜单、自身不导航；
   * 子树内层级不再判定 menuType；不与 appName 组合）
   */
  menuType?: 'normal' | 'user-dropdown';

  /** 后端节点类型（旧后端 /user/menu/tree 的 type 字段，09-14 补充）：用于区分应用根/菜单/目录/按钮 */
  type?: 'app' | 'menu' | 'button' | 'group';
  children?: MenuItem[];
}

export interface UserInfo {
  id?: number | string;
  username: string;
  nickname?: string;
  avatar?: string;
}

export interface LoginResult {
  token: string;
  refreshToken?: string;
  user?: UserInfo;
}

export * from './config';
export * from './layout';
export * from './menu';

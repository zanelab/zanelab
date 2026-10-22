/// <reference path="./sm-crypto.d.ts" />

export interface MenuItem {
  id: number;
  name: string;
  icon?: string;
  path: string;
  appName?: string;
  permission?: string;
  component?: string;

  i18nKey?: string;

  menuType?: 'normal' | 'user-dropdown';

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

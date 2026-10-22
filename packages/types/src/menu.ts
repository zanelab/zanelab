import type { ReactNode } from 'react';

export interface MenuRecordRaw {
  path: string;
  name: string;
  icon?: string | ReactNode;
  activeIcon?: string | ReactNode;

  parents?: string[];
  badge?: string | number;
  badgeType?: string;
  badgeVariants?: string;
  query?: Record<string, unknown>;
  children?: MenuRecordRaw[];
  meta?: {
    title: string;
    hideInMenu?: boolean;
    hideInBreadcrumb?: boolean;
    hideInTab?: boolean;
    activePath?: string;
    badge?: string;
    badgeType?: string;
    icon?: string;
    order?: number;
  };
}

export interface MenuProps {
  items: MenuRecordRaw[];
  mode?: 'vertical' | 'horizontal';
  collapsed?: boolean;
  collapsedShowTitle?: boolean;
  theme?: 'dark' | 'light';
  accordion?: boolean;
  styleType?: 'plain' | 'rounded';
  onSelect?: (path: string) => void;
}

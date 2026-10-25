export interface TabDefinition {
  fullPath?: string;
  meta?: {
    affixTab?: boolean;
    icon?: string;
    newTabTitle?: string;
    tabClosable?: boolean;
    title?: string;
  };
  name?: string;
  path?: string;
  key: string;
}

export type TabsStyleType = 'chrome' | 'plain' | 'card' | 'brisk';

export interface IContextMenuItem {
  key: string;
  text: string;
  disabled?: boolean;
  shortcut?: string;
  handler?: (data: any) => void;

  /** 图标注册名（BUILTIN_ICONS，经 AppIcon 渲染）；09-08-icon-consolidation
   *  起语义由 path data 字符串改为注册名 */
  icon?: string;
  children?: IContextMenuItem[];
  divider?: boolean;
}

export type TabsEmits = {
  close: (key: string) => void;
  sortTabs: (oldIndex: number, newIndex: number) => void;
  unpin: (tab: TabDefinition) => void;
};

export interface TabsProps {
  active?: string;
  contentClass?: string;
  contextMenus?: (data: any) => IContextMenuItem[];
  draggable?: boolean;
  gap?: number;
  maxWidth?: number;
  middleClickToClose?: boolean;
  minWidth?: number;
  showIcon?: boolean;
  styleType?: TabsStyleType;
  tabs?: TabDefinition[];
  wheelable?: boolean;
  onClose?: (key: string) => void;
  onSortTabs?: (oldIndex: number, newIndex: number) => void;
  onUnpin?: (tab: TabDefinition) => void;
  onActiveChange?: (key: string) => void;
}

export interface TabConfig extends TabDefinition {
  affixTab: boolean;
  closable: boolean;
  icon: string;
  key: string;
  title: string;
}

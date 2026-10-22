import { useCallback, useMemo } from 'react';
import type { FC } from 'react';
import type { TabConfig, TabDefinition, TabsProps } from './types';
import { ContextMenu } from './context-menu';
import { AppIcon, renderMenuIcon } from '../icons/app-icon';

const typeClasses: Record<string, string> = {
  brisk: `h-full after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1.5px] after:bg-primary after:scale-x-0 after:transition-[transform] after:ease-out after:duration-300 hover:after:scale-x-100 after:origin-left [&.is-active]:after:scale-x-100 [&:not(:first-child)]:border-l last:border-r border-base-300`,
  card: 'h-[calc(100%-6px)] rounded-md ml-2 border border-base-300 transition-all',
  plain: 'h-full [&:not(:first-child)]:border-l last:border-r border-base-300',
};

export const Tabs: FC<TabsProps> = (props) => {
  const {
    active,
    contentClass = 'admin-tabs-content',
    contextMenus,
    showIcon,
    styleType = 'plain',
    tabs = [],
    onClose,
    onUnpin,
    onActiveChange,
    middleClickToClose,
  } = props;

  const typeClass = typeClasses[styleType] || typeClasses.plain;

  const tabsView = useMemo(() => {
    return tabs.map((tab) => {
      const { fullPath, meta, name, path, key } = tab || {};
      const { affixTab, icon, newTabTitle, tabClosable, title } = meta || {};
      return {
        affixTab: !!affixTab,
        closable: Reflect.has(meta || {}, 'tabClosable') ? !!tabClosable : true,
        fullPath,
        icon: icon as string,
        key,
        meta,
        name,
        path,
        title: (newTabTitle || title || name) as string,
      } as TabConfig;
    });
  }, [tabs]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent, tab: TabConfig) => {
      if (
        e.button === 1 &&
        tab.closable &&
        !tab.affixTab &&
        tabsView.length > 1 &&
        middleClickToClose
      ) {
        e.preventDefault();
        e.stopPropagation();
        onClose?.(tab.key);
      }
    },
    [tabsView.length, middleClickToClose, onClose],
  );

  return (
    <div
      className={`relative flex! h-full w-max items-center overflow-hidden pr-6 ${contentClass}`}
    >
      {tabsView.map((tab, i) => (
        <div
          key={tab.key}
          className={`group tab-item translate-all [&:not(.is-active)]:hover:bg-base-200 relative flex cursor-pointer select-none ${typeClass} ${
            tab.key === active ? 'is-active bg-primary/20' : ''
          } ${!tab.affixTab ? 'draggable' : 'affix-tab'}`}
          data-tab-item="true"
          data-index={i}
          onClick={() => onActiveChange?.(tab.key)}
          onMouseDown={(e) => onMouseDown(e, tab)}
        >
          <ContextMenu
            handlerData={tab as unknown as TabDefinition}
            items={contextMenus ?? (() => [])}
            itemClass="pr-6"
          >
            <div className="relative flex size-full items-center">
              <div className="absolute top-1/2 right-1.5 z-3 translate-y-[-50%] overflow-hidden">
                {!tab.affixTab && tabsView.length > 1 && tab.closable && (
                  <AppIcon
                    name="close"
                    className="stroke-base-content/80 group-[.is-active]:text-primary hover:bg-base-200 hover:stroke-base-content size-3 cursor-pointer rounded-full transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose?.(tab.key);
                    }}
                  />
                )}
                {tab.affixTab && tabsView.length > 1 && tab.closable && (
                  <AppIcon
                    name="pin"
                    className="group-[.is-active]:text-primary hover:bg-base-200 hover:stroke-base-content mt-px size-3.5 cursor-pointer rounded-full transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnpin?.(tab as TabDefinition);
                    }}
                  />
                )}
              </div>

              <div className="text-base-content group-[.is-active]:text-primary mx-3 mr-4 flex h-full items-center overflow-hidden rounded-tl-[5px] rounded-tr-[5px] pr-3 transition-all duration-300">
                {showIcon && tab.icon && (
                  <span className="mr-2 flex size-4 items-center overflow-hidden">
                    {renderMenuIcon(tab.icon, 'size-4')}
                  </span>
                )}
                <span className="flex-1 overflow-hidden text-sm whitespace-nowrap">
                  {tab.title}
                </span>
              </div>
            </div>
          </ContextMenu>
        </div>
      ))}
    </div>
  );
};

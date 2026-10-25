import { useCallback, useMemo } from 'react';
import type { FC } from 'react';
import type { TabConfig, TabDefinition, TabsProps } from './types';
import { ContextMenu } from './context-menu';
import { AppIcon, renderMenuIcon } from '../icons/app-icon';

export const TabsChrome: FC<TabsProps> = (props) => {
  const {
    active,
    contentClass = 'admin-tabs-content',
    contextMenus,
    gap = 7,
    showIcon,
    tabs = [],
    onClose,
    onUnpin,
    onActiveChange,
    middleClickToClose,
  } = props;

  const style = useMemo(
    () => ({ '--gap': `${gap}px` }) as React.CSSProperties,
    [gap],
  );

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
      className={`tabs-chrome flex! h-full w-max overflow-y-hidden pr-6 ${contentClass}`}
      style={style}
    >
      {tabsView.map((tab, i) => (
        <div
          key={tab.key}
          className={`draggable group tabs-chrome__item translate-all relative -mr-3 flex h-full items-center select-none ${
            tab.key === active ? 'is-active' : ''
          } ${!tab.affixTab ? 'draggable' : 'affix-tab'}`}
          data-tab-item="true"
          data-index={i}
          data-active-tab={active}
          onClick={() => onActiveChange?.(tab.key)}
          onMouseDown={(e) => onMouseDown(e, tab)}
        >
          <ContextMenu
            handlerData={tab as unknown as TabDefinition}
            items={contextMenus ?? (() => [])}
            itemClass="pr-6"
          >
            <div className="relative size-full px-1">
              {/* divider */}
              {i !== 0 && tab.key !== active && (
                <div className="tabs-chrome__divider bg-border absolute top-1/2 left-[var(--gap)] z-0 h-4 w-px translate-y-[-50%] transition-all" />
              )}
              {/* background */}
              <div className="tabs-chrome__background absolute z-[-1] size-full px-[calc(var(--gap)-1px)] py-0 transition-opacity duration-150">
                {/* 激活态背景统一 primary（09-09 主题色适配）：此前暗色回退
                    bg-accent（reference 的 dark: 变体），换主题色时标签无感；
                    /20 保证暗底上有可见色差（/15 在暗色下几乎无色差） */}
                <div className="tabs-chrome__background-content group-[.is-active]:bg-primary/20 h-full rounded-tl-[var(--gap)] rounded-tr-[var(--gap)] duration-150" />
                <svg
                  className="tabs-chrome__background-before group-[.is-active]:fill-primary/20 absolute bottom-0 -left-px fill-transparent transition-all duration-150"
                  height="7"
                  width="7"
                >
                  <path d="M 0 7 A 7 7 0 0 0 7 0 L 7 7 Z" />
                </svg>
                <svg
                  className="tabs-chrome__background-after group-[.is-active]:fill-primary/20 absolute -right-px bottom-0 fill-transparent transition-all duration-150"
                  height="7"
                  width="7"
                >
                  <path d="M 0 0 A 7 7 0 0 0 7 7 L 0 7 Z" />
                </svg>
              </div>

              {/* extra */}
              <div className="tabs-chrome__extra absolute top-1/2 right-[var(--gap)] z-3 size-4 translate-y-[-50%]">
                {!tab.affixTab && tabsView.length > 1 && tab.closable && (
                  <AppIcon
                    name="close"
                    className="stroke-accent-foreground/80 text-accent-foreground/80 group-[.is-active]:text-primary hover:bg-accent hover:stroke-accent-foreground mt-0.5 size-3 cursor-pointer rounded-full transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose?.(tab.key);
                    }}
                  />
                )}
                {tab.affixTab && tabsView.length > 1 && tab.closable && (
                  <AppIcon
                    name="pin"
                    className="text-accent-foreground/80 group-[.is-active]:text-primary hover:text-accent-foreground mt-px size-3.5 cursor-pointer rounded-full transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnpin?.(tab as TabDefinition);
                    }}
                  />
                )}
              </div>

              {/* tab-item-main */}
              <div className="tabs-chrome__item-main text-accent-foreground group-[.is-active]:text-primary z-2 mx-[calc(var(--gap)*2)] my-0 flex h-full items-center overflow-hidden rounded-tl-[5px] rounded-tr-[5px] pr-4 pl-2 duration-150">
                {showIcon && tab.icon && (
                  <span className="mr-1 flex size-4 items-center overflow-hidden">
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

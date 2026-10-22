import { useCallback } from 'react';
import type { FC } from 'react';
import type { TabsProps } from './types';
import { TabsChrome } from './tabs-chrome';
import { Tabs } from './tabs';
import { AppIcon } from '../icons/app-icon';
import { useTabsDrag } from './use-tabs-drag';
import { useTabsViewScroll } from './use-tabs-view-scroll';

interface TabsViewProps extends TabsProps {
  className?: string;
  onClose?: (key: string) => void;
  onSortTabs?: (oldIndex: number, newIndex: number) => void;
  onUnpin?: (tab: any) => void;
  onActiveChange?: (key: string) => void;
}

export const TabsView: FC<TabsViewProps> = (props) => {
  const {
    className,
    contentClass: _contentClass,
    draggable: _draggable = true,
    styleType = 'chrome',
    wheelable = true,
    onClose,
    onSortTabs,
    onUnpin,
    onActiveChange,
  } = props;

  const {
    scrollbarRef,
    scrollDirection,
    scrollIsAtLeft,
    scrollIsAtRight,
    showScrollButton,
    handleScrollAt: _handleScrollAt,
    handleWheel,
  } = useTabsViewScroll(props);

  useTabsDrag(props, { onSortTabs });

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (wheelable) {
        handleWheel(e.nativeEvent);
        e.stopPropagation();
        e.preventDefault();
      }
    },
    [wheelable, handleWheel],
  );

  const tabProps = {
    ...props,
    onClose,
    onUnpin,
    onActiveChange,
  };

  return (
    <div className={`flex h-full flex-1 overflow-hidden ${className ?? ''}`}>
      {showScrollButton && (
        <span
          className={`flex items-center border-r px-2 ${
            scrollIsAtLeft
              ? 'pointer-events-none opacity-30'
              : 'text-base-content/60 hover:bg-base-200 cursor-pointer'
          }`}
          onClick={() => scrollDirection('left')}
        >
          <AppIcon name="chevrons-left" className="size-4 h-full" />
        </span>
      )}

      <div
        className={`size-full flex-1 overflow-hidden ${styleType === 'chrome' ? 'pt-0.75' : ''}`}
      >
        <div
          ref={scrollbarRef}
          className="h-full overflow-x-auto overflow-y-hidden"
          onWheel={onWheel}
        >
          {styleType === 'chrome' ? (
            <TabsChrome {...tabProps} />
          ) : (
            <Tabs {...tabProps} />
          )}
        </div>
      </div>

      {showScrollButton && (
        <span
          className={`flex items-center border-l px-2 ${
            scrollIsAtRight
              ? 'pointer-events-none opacity-30'
              : 'text-base-content/60 hover:bg-base-200 cursor-pointer'
          }`}
          onClick={() => scrollDirection('right')}
        >
          <AppIcon name="chevrons-right" className="size-4 h-full" />
        </span>
      )}
    </div>
  );
};

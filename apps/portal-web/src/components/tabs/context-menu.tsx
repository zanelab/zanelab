import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { IContextMenuItem } from './types';
import { AppIcon } from '../icons/app-icon';

interface ContextMenuProps {
  items: (data: any) => IContextMenuItem[];

  handlerData?: any;
  children: ReactNode;
  itemClass?: string;
}

export function ContextMenu({
  items,
  handlerData,
  children,
  itemClass = '',
}: ContextMenuProps) {
  const [state, setState] = useState<{
    x: number;
    y: number;
    menus: IContextMenuItem[];
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state) return;
    const close = () => setState(null);
    document.addEventListener('click', close);
    document.addEventListener('contextmenu', close);
    window.addEventListener('blur', close);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('contextmenu', close);
      window.removeEventListener('blur', close);
      window.removeEventListener('resize', close);
    };
  }, [state]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const menus = items(handlerData) ?? [];
      setState({ x: e.clientX, y: e.clientY, menus });
    },
    [items, handlerData],
  );

  const MENU_WIDTH = 180;
  const MENU_HEIGHT_ESTIMATE = 32;
  let left = state?.x ?? 0;
  let top = state?.y ?? 0;
  if (state) {
    const menuHeight =
      menuRef.current?.offsetHeight ??
      state.menus.length * MENU_HEIGHT_ESTIMATE;
    if (left + MENU_WIDTH > window.innerWidth) {
      left = Math.max(window.innerWidth - MENU_WIDTH, 0);
    }
    if (top + menuHeight > window.innerHeight) {
      top = Math.max(window.innerHeight - menuHeight, 0);
    }
  }

  return (
    <>
      <div className="contents" onContextMenu={handleContextMenu}>
        {children}
      </div>
      {state && state.menus.length > 0 && (
        <div
          ref={menuRef}
          className="border-base-300 bg-base-100 fixed z-[1000] min-w-[10rem] overflow-hidden rounded-md border py-1 shadow-lg"
          style={{ left, top }}
          onClick={(e) => e.stopPropagation()}
        >
          {state.menus.map((item) =>
            item.divider ? (
              <div
                key={`divider-${item.key}`}
                className="bg-base-300 my-1 h-px"
              />
            ) : (
              <button
                key={item.key}
                type="button"
                disabled={item.disabled}
                className={`text-base-content hover:bg-base-200 flex w-full cursor-pointer items-center rounded-sm px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${itemClass}`}
                onClick={() => {
                  setState(null);
                  item.handler?.(handlerData);
                }}
              >
                {item.icon ? (
                  <AppIcon
                    name={item.icon}
                    className="mr-2 size-3.5 shrink-0"
                  />
                ) : null}
                <span className="flex-1 truncate">{item.text}</span>
                {item.shortcut ? (
                  <span className="ml-4 text-xs opacity-50">
                    {item.shortcut}
                  </span>
                ) : null}
              </button>
            ),
          )}
        </div>
      )}
    </>
  );
}

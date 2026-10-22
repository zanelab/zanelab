import { useRef, useState } from 'react';
import type { FC } from 'react';
import type { IContextMenuItem } from './types';
import { AnchoredPortal } from '@zanelab/ui';
import { AppIcon } from '../icons/app-icon';

interface ToolMoreProps {
  menus?: IContextMenuItem[];
}

export const ToolMore: FC<ToolMoreProps> = ({ menus }) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div
        ref={anchorRef}
        className="flex-center border-border text-muted-foreground hover:bg-muted hover:text-foreground h-full cursor-pointer border-l px-2 text-lg font-semibold"
        onClick={() => setOpen((v) => !v)}
      >
        <AppIcon name="more-vertical" className="size-4" />
      </div>
      <AnchoredPortal
        open={open && !!menus && menus.length > 0}
        anchorRef={anchorRef}
        onClose={() => setOpen(false)}
      >
        <ul className="border-base-300 bg-base-100 min-w-40 rounded-md border py-1 shadow-lg">
          {menus?.map((item) => (
            <li key={item.key}>
              <a
                className="hover:bg-base-200 flex cursor-pointer items-center rounded-sm px-3 py-1.5 text-sm"
                onClick={() => {
                  setOpen(false);
                  item.handler?.(item);
                }}
              >
                {item.icon ? (
                  <AppIcon
                    name={item.icon}
                    className="mr-2 size-3.5 shrink-0"
                  />
                ) : null}
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </AnchoredPortal>
    </>
  );
};

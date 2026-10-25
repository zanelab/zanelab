import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { MenuRecordRaw } from '@zanelab/types';
import { AppIcon } from '../../../icons/app-icon';
import { SearchPanel } from './search-panel';

function isWindowsOs() {
  return navigator.userAgent.toLowerCase().includes('windows');
}

interface GlobalSearchProps {
  enableShortcutKey?: boolean;

  menus?: MenuRecordRaw[];

  className?: string;
}

export function GlobalSearch({
  enableShortcutKey = true,
  menus = [],
  className = '',
}: GlobalSearchProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const preventDefaultBrowserSearchHotKey = useCallback(
    (event: KeyboardEvent) => {
      if (
        event.key?.toLowerCase() === 'k' &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
      }
    },
    [],
  );

  useEffect(() => {
    if (!enableShortcutKey) return;
    window.addEventListener('keydown', preventDefaultBrowserSearchHotKey);
    return () => {
      window.removeEventListener('keydown', preventDefaultBrowserSearchHotKey);
    };
  }, [enableShortcutKey, preventDefaultBrowserSearchHotKey]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        if (!enableShortcutKey) return;
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enableShortcutKey]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setKeyword('');
    }
  }, [open]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setKeyword('');
  }, []);

  const toggleOpen = () => setOpen((v) => !v);

  return (
    <div className={className}>
      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-999 flex items-start justify-center pt-[15vh]"
              onClick={handleClose}
            >
              <div className="fixed inset-0 bg-black/40" />
              <div
                className="border-base-300 bg-base-100 relative w-150 max-w-[90vw] overflow-hidden rounded-xl border shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="border-base-300 flex items-center border-b py-2 pl-4">
                  <AppIcon
                    name="search"
                    className="text-base-content/60 mr-2 size-4"
                  />
                  <input
                    ref={inputRef}
                    type="text"
                    className="text-base-content placeholder:text-base-content/50 w-[80%] rounded-md border-none bg-transparent p-2 pl-0 text-sm font-normal outline-none"
                    placeholder={t('widgets.search.placeholder')}
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                </div>

                <SearchPanel
                  keyword={keyword}
                  menus={menus}
                  onClose={handleClose}
                />

                <div className="border-base-300 text-base-content/60 flex w-full justify-start border-t px-4 py-2 text-xs">
                  <div className="mr-2 flex items-center">
                    <AppIcon name="corner-down-left" className="mr-1 size-3" />
                    {t('widgets.search.select')}
                  </div>
                  <div className="mr-2 flex items-center">
                    <AppIcon name="arrow-up" className="mr-1 size-3" />
                    <AppIcon name="arrow-down" className="mr-1 size-3" />
                    {t('widgets.search.toggle')}
                  </div>
                  <div className="flex items-center">
                    <AppIcon name="chevrons-down" className="mr-1 size-3" />
                    {t('common.close')}
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      <div
        className="group md:bg-accent flex h-8 cursor-pointer items-center gap-3 rounded-2xl border-none bg-none px-2 py-0.5 outline-hidden"
        onClick={toggleOpen}
      >
        <AppIcon
          name="search"
          className="text-base-content/60 group-hover:text-foreground size-4 shrink-0 group-hover:opacity-100"
        />
        <span className="text-base-content/60 group-hover:text-foreground hidden min-w-0 text-xs duration-300 md:block md:flex-1 md:truncate">
          {t('widgets.search.search')}
        </span>
        {enableShortcutKey ? (
          <span className="border-foreground/60 bg-base-100 text-base-content/60 group-hover:text-foreground relative hidden shrink-0 rounded-sm rounded-r-xl px-1.5 py-1 text-xs leading-none group-hover:opacity-100 md:block">
            {isWindowsOs() ? 'Ctrl' : '⌘'}
            <kbd>K</kbd>
          </span>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

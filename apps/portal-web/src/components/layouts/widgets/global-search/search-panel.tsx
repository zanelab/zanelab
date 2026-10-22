import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { MenuRecordRaw } from '@zanelab/types';
import { AppIcon } from '../../../icons/app-icon';
import { Scrollbar } from '@zanelab/ui';

interface SearchPanelProps {
  keyword?: string;
  menus?: MenuRecordRaw[];
  onClose?: () => void;
}

function isHttpUrl(path: string): boolean {
  return /^https?:\/\//.test(path);
}

function uniqueByField<T>(list: T[], field: keyof T): T[] {
  const seen = new Set<unknown>();
  return list.filter((item) => {
    const key = item[field];
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function traverseTreeValues(
  tree: MenuRecordRaw[],
  callback: (item: MenuRecordRaw) => void,
) {
  const stack = [...tree];
  while (stack.length > 0) {
    const node = stack.pop()!;
    callback(node);
    if (node.children?.length) stack.push(...node.children);
  }
}

const code = new Set([
  '$',
  '(',
  ')',
  '*',
  '+',
  '.',
  '?',
  '[',
  '\\',
  ']',
  '^',
  '{',
  '|',
  '}',
]);

function transform(c: string) {
  return code.has(c) ? `\\${c}` : c;
}

function createSearchReg(key: string) {
  const keys = [...key].map((item) => transform(item)).join('.*');
  return new RegExp(`.*${keys}.*`);
}

const HISTORY_KEY = `__search-history-${location.hostname}__`;

function readSearchHistory(): MenuRecordRaw[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as MenuRecordRaw[]) : [];
  } catch {
    return [];
  }
}

function writeSearchHistory(items: MenuRecordRaw[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {}
}

export function SearchPanel({
  keyword = '',
  menus = [],
  onClose,
}: SearchPanelProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchHistory, setSearchHistory] =
    useState<MenuRecordRaw[]>(readSearchHistory);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchResults, setSearchResults] = useState<MenuRecordRaw[]>([]);
  const isNavigatingRef = useRef(false);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const resultsRef = useRef<MenuRecordRaw[]>([]);
  const activeIndexRef = useRef(-1);

  resultsRef.current = searchResults;
  activeIndexRef.current = activeIndex;

  const searchItems = useMemo(() => [...menus], [menus]);

  const search = useCallback(
    (searchKey: string) => {
      searchKey = searchKey.trim();

      if (!searchKey) {
        setSearchResults([]);
        return;
      }

      searchKey = searchKey.toLowerCase();

      const reg = createSearchReg(searchKey);
      const results: MenuRecordRaw[] = [];

      traverseTreeValues(searchItems, (item) => {
        if (reg.test(item.name?.toLowerCase())) {
          results.push(item);
        }
      });

      setSearchResults(results);
      setActiveIndex(0);
    },
    [searchItems],
  );

  function scrollIntoView() {
    const element = document.querySelector(
      `[data-search-item="${activeIndexRef.current}"]`,
    );
    if (element) {
      element.scrollIntoView({ block: 'nearest' });
    }
  }

  function handleClose() {
    setSearchResults([]);
    onClose?.();
  }

  function handleEnter() {
    const result = resultsRef.current;
    const index = activeIndexRef.current;
    if (result.length === 0 || index < 0) {
      return;
    }
    const to = result[index];
    if (to) {
      setSearchHistory((prev) => {
        const next = uniqueByField([...prev, to], 'path');
        writeSearchHistory(next);
        return next;
      });
      handleClose();
      if (isHttpUrl(to.path)) {
        window.open(to.path, '_blank');
      } else {
        navigate(to.path, { replace: true });
      }
    }
  }

  function handleUp() {
    if (resultsRef.current.length === 0) {
      return;
    }
    isNavigatingRef.current = true;
    let index = activeIndexRef.current - 1;
    if (index < 0) {
      index = resultsRef.current.length - 1;
    }
    activeIndexRef.current = index;
    setActiveIndex(index);
    scrollIntoView();
  }

  function handleDown() {
    if (resultsRef.current.length === 0) {
      return;
    }
    isNavigatingRef.current = true;
    let index = activeIndexRef.current + 1;
    if (index > resultsRef.current.length - 1) {
      index = 0;
    }
    activeIndexRef.current = index;
    setActiveIndex(index);
    scrollIntoView();
  }

  function handleMouseenter(e: React.MouseEvent) {
    if (isNavigatingRef.current) return;
    const index = (e.target as HTMLElement)?.dataset.index;
    setActiveIndex(Number(index));
  }

  function removeItem(index: number) {
    if (keyword) {
      setSearchResults((prev) => prev.filter((_, i) => i !== index));
    } else {
      setSearchHistory((prev) => {
        const next = prev.filter((_, i) => i !== index);
        writeSearchHistory(next);
        return next;
      });
      setSearchResults((prev) => prev.filter((_, i) => i !== index));
    }
    const next = Math.max(activeIndexRef.current - 1, 0);
    activeIndexRef.current = next;
    setActiveIndex(next);
    scrollIntoView();
  }

  useEffect(() => {
    if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
    throttleTimerRef.current = setTimeout(() => {
      if (keyword) {
        search(keyword);
      } else {
        setSearchResults(searchHistory);
      }
    }, 200);
    return () => {
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
    };
  }, [keyword, search]);

  useEffect(() => {
    if (searchHistory.length > 0) {
      setSearchResults(searchHistory);
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleEnter();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleUp();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleDown();
      } else if (e.key === 'Escape') {
        handleClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      isNavigatingRef.current = false;
    };
    document.addEventListener('mousemove', handler);
    return () => document.removeEventListener('mousemove', handler);
  }, []);

  const uniqueResults = useMemo(
    () => uniqueByField(searchResults, 'path'),
    [searchResults],
  );

  return (
    <Scrollbar>
      <div className="flex! h-full justify-center px-2 sm:max-h-112.5">
        {keyword && uniqueResults.length === 0 && (
          <div className="text-muted-foreground text-center">
            <AppIcon name="search-x" className="mx-auto mt-4 size-12" />
            <p className="mt-6 mb-10 text-xs">
              {t('widgets.search.notFound')}
              <span className="text-foreground text-sm font-medium">
                "{keyword}"
              </span>
            </p>
          </div>
        )}
        {!keyword && uniqueResults.length === 0 && (
          <div className="text-muted-foreground text-center">
            <p className="my-10 text-xs">{t('widgets.search.noHistory')}</p>
          </div>
        )}

        <ul className={uniqueResults.length > 0 ? 'w-full' : 'hidden w-full'}>
          {searchHistory.length > 0 && !keyword && (
            <li className="text-muted-foreground mb-2 text-xs">
              {t('widgets.search.recent')}
            </li>
          )}
          {uniqueResults.map((item, index) => (
            <li
              key={item.path}

              className={[
                'group flex-center mb-3 w-full cursor-pointer rounded-lg p-4',
                activeIndex === index
                  ? 'bg-primary/10 text-foreground'
                  : 'bg-accent',
              ].join(' ')}
              data-index={index}
              data-search-item={index}
              onClick={handleEnter}
              onMouseEnter={handleMouseenter}
            >
              <AppIcon name="circle" className="mr-2 size-5 shrink-0" />
              <span className="flex-1">{item.name}</span>
              <div
                className="flex-center hover:bg-base-200 rounded-full p-1 hover:scale-110"
                onClick={(e) => {
                  e.stopPropagation();
                  removeItem(index);
                }}
              >
                <AppIcon name="close" className="size-4" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Scrollbar>
  );
}

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

// 存储所有需要转义的特殊字符
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

// 转换函数，用于转义特殊字符
function transform(c: string) {
  return code.has(c) ? `\\${c}` : c;
}

// 创建搜索正则表达式
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
  } catch {
    // ignore quota errors
  }
}

/**
 * SearchPanel — result list of the global search modal with keyboard
 * navigation and localStorage-backed search history.
 * React port of widgets/global-search/search-panel.vue
 */
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

  // 搜索函数，用于根据搜索关键词查找匹配的菜单项
  const search = useCallback(
    (searchKey: string) => {
      searchKey = searchKey.trim();

      if (!searchKey) {
        setSearchResults([]);
        return;
      }
      // 将搜索关键词转换为小写，确保大小写不敏感的搜索
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

  // When the keyboard up and down keys move to an invisible place
  // the scroll bar needs to scroll automatically
  function scrollIntoView() {
    const element = document.querySelector(
      `[data-search-item="${activeIndexRef.current}"]`,
    );
    if (element) {
      element.scrollIntoView({ block: 'nearest' });
    }
  }

  // close search modal
  function handleClose() {
    setSearchResults([]);
    onClose?.();
  }

  // enter keyboard event
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

  // Arrow key up
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

  // Arrow key down
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

  // Activate when the mouse moves to a certain line
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

  // Throttled search (200ms)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, search]);

  // Initialize results with history
  useEffect(() => {
    if (searchHistory.length > 0) {
      setSearchResults(searchHistory);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard strokes
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track mousemove to re-enable hover activation
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
        {/* 无搜索结果 */}
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
        {/* 历史搜索记录 & 没有搜索结果 */}
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
              // 底色必须互斥：bg-accent 与 bg-primary 同为 background-color 工具类，
              // 同时书写时谁生效取决于 Tailwind 生成顺序（不是 class 顺序）——曾出现
              // 浅灰底 + text-primary-foreground（近白）→ 文字看不见（09-24 修复）。
              // 选中/悬停态：主题色 10% 淡底 + 正文深色（不再是白字）。
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
                // hover 用底色反馈：原先 hover:text-primary-foreground（近白）在浅底上
                // 同样看不见；dark:hover:bg-accent 只对暗色生效，一并去掉
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

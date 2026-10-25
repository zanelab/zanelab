import { useCallback, useEffect, useRef, useState } from 'react';
import type { TabsProps } from './types';

export function useTabsViewScroll(props: TabsProps) {
  const scrollbarRef = useRef<HTMLDivElement | null>(null);
  const scrollViewportEl = useRef<Element | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [scrollIsAtLeft, setScrollIsAtLeft] = useState(true);
  const [scrollIsAtRight, setScrollIsAtRight] = useState(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  const tabItemCountRef = useRef(0);

  // props.tabs 每次渲染都是新引用（tabbar.tsx: currentTabs.map(toTabsTab)），
  // 若放入 initScrollbar 依赖 → 每次 initScrollbar 重建 → useEffect 重跑 →
  // calcShowScrollbarButton → setShowScrollButton → 重渲染 → 无限循环。
  // 用 ref 读取最新值，不参与依赖。
  const propsTabsRef = useRef(props.tabs);
  propsTabsRef.current = props.tabs;

  const getScrollClientWidth = useCallback(() => {
    const scrollbarEl = scrollbarRef.current;
    if (!scrollbarEl || !scrollViewportEl.current) return {};
    const scrollbarWidth = scrollbarEl.clientWidth;
    const scrollViewWidth = (scrollViewportEl.current as HTMLElement)
      .clientWidth;
    return { scrollbarWidth, scrollViewWidth };
  }, []);

  const scrollDirection = useCallback(
    (direction: 'left' | 'right', distance: number = 150) => {
      const { scrollbarWidth, scrollViewWidth } = getScrollClientWidth();
      if (!scrollbarWidth || !scrollViewWidth) return;
      if (scrollbarWidth > scrollViewWidth) return;
      scrollViewportEl.current?.scrollBy({
        behavior: 'smooth',
        left:
          direction === 'left'
            ? -(scrollbarWidth - distance)
            : +(scrollbarWidth - distance),
      });
    },
    [getScrollClientWidth],
  );

  const scrollToActiveIntoView = useCallback(() => {
    if (!scrollViewportEl.current) return;
    const viewportEl = scrollViewportEl.current;
    const { scrollbarWidth } = getScrollClientWidth();
    const { scrollWidth } = viewportEl;
    if (scrollbarWidth && scrollbarWidth >= scrollWidth) return;
    requestAnimationFrame(() => {
      const activeItem = viewportEl.querySelector('.is-active');
      activeItem?.scrollIntoView({ behavior: 'smooth', inline: 'start' });
    });
  }, [getScrollClientWidth]);

  const calcShowScrollbarButton = useCallback(() => {
    if (!scrollViewportEl.current) return;
    const { scrollbarWidth } = getScrollClientWidth();
    const el = scrollViewportEl.current as HTMLElement;
    const shouldShow = el.scrollWidth > (scrollbarWidth || 0);
    setShowScrollButton((prev) => (prev === shouldShow ? prev : shouldShow));
  }, [getScrollClientWidth]);

  const handleScrollAt = useCallback(
    ({ left, right }: { left: boolean; right: boolean }) => {
      setScrollIsAtLeft(left);
      setScrollIsAtRight(right);
    },
    [],
  );

  const handleWheel = useCallback((e: WheelEvent) => {
    (scrollViewportEl.current as HTMLElement)?.scrollBy({
      left: e.deltaY * 3,
    });
  }, []);

  const initScrollbar = useCallback(() => {
    const scrollbarEl = scrollbarRef.current;
    if (!scrollbarEl) return;
    const viewportEl =
      scrollbarEl.querySelector('[data-reka-scroll-area-viewport]') ||
      scrollbarEl.querySelector(':scope > div');
    if (!viewportEl) return;
    scrollViewportEl.current = viewportEl;
    calcShowScrollbarButton();
    setTimeout(() => scrollToActiveIntoView(), 50);

    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = new ResizeObserver(() => {
      calcShowScrollbarButton();
      scrollToActiveIntoView();
    });
    resizeObserverRef.current.observe(viewportEl);

    tabItemCountRef.current = propsTabsRef.current?.length || 0;
    mutationObserverRef.current?.disconnect();
    mutationObserverRef.current = new MutationObserver(() => {
      const count = viewportEl.querySelectorAll(
        '[data-tab-item="true"]',
      ).length;
      if (count > tabItemCountRef.current) {
        scrollToActiveIntoView();
      }
      if (count !== tabItemCountRef.current) {
        calcShowScrollbarButton();
        tabItemCountRef.current = count;
      }
    });
    mutationObserverRef.current.observe(viewportEl, {
      attributes: false,
      childList: true,
      subtree: true,
    });
  }, [calcShowScrollbarButton, scrollToActiveIntoView]);

  useEffect(() => {
    initScrollbar();
  }, [props.styleType, initScrollbar]);

  useEffect(() => {
    scrollToActiveIntoView();
  }, [props.active, scrollToActiveIntoView]);

  useEffect(() => {
    return () => {
      resizeObserverRef.current?.disconnect();
      mutationObserverRef.current?.disconnect();
    };
  }, []);

  return {
    scrollbarRef,
    scrollDirection,
    scrollIsAtLeft,
    scrollIsAtRight,
    showScrollButton,
    handleScrollAt,
    handleWheel,
    initScrollbar,
  };
}

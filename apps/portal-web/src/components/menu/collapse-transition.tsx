import { useRef, useEffect, useCallback } from 'react';

interface CollapseTransitionProps {
  show: boolean;
  children: React.ReactNode;
}

export function CollapseTransition({
  show,
  children,
}: CollapseTransitionProps) {
  const elRef = useRef<HTMLElement | null>(null);

  const genRef = useRef(0);
  const initialRef = useRef(true);
  const showRef = useRef(show);
  showRef.current = show;

  function beforeEnter(el: HTMLElement) {
    el.dataset.oldPaddingTop = el.style.paddingTop;
    el.dataset.oldMarginTop = el.style.marginTop;
    el.dataset.oldPaddingBottom = el.style.paddingBottom;
    el.dataset.oldMarginBottom = el.style.marginBottom;
    if (el.style.height) el.dataset.elExistsHeight = el.style.height;

    el.style.maxHeight = '0';
    el.style.paddingTop = '0';
    el.style.marginTop = '0';
    el.style.paddingBottom = '0';
    el.style.marginBottom = '0';
  }

  function enter(el: HTMLElement) {
    const gen = ++genRef.current;
    requestAnimationFrame(() => {
      el.dataset.oldOverflow = el.style.overflow;
      if (el.dataset.elExistsHeight) {
        el.style.maxHeight = el.dataset.elExistsHeight;
      } else if (el.scrollHeight === 0) {
        el.style.maxHeight = '0';
      } else {
        el.style.maxHeight = `${el.scrollHeight}px`;
      }

      el.style.paddingTop = el.dataset.oldPaddingTop ?? '';
      el.style.paddingBottom = el.dataset.oldPaddingBottom ?? '';
      el.style.marginTop = el.dataset.oldMarginTop ?? '';
      el.style.marginBottom = el.dataset.oldMarginBottom ?? '';
      el.style.overflow = 'hidden';

      const finish = () => {
        el.style.maxHeight = '';
        el.style.overflow = el.dataset.oldOverflow ?? '';
        el.removeEventListener('transitionend', onEnd);
        clearTimeout(fallback);
      };
      const onEnd = (e: Event) => {
        if (e.target !== el || genRef.current !== gen) return;
        finish();
      };

      const fallback = setTimeout(() => {
        if (genRef.current === gen) finish();
      }, 400);
      el.addEventListener('transitionend', onEnd);
    });
  }

  function beforeLeave(el: HTMLElement) {
    el.dataset.oldPaddingTop = el.style.paddingTop;
    el.dataset.oldMarginTop = el.style.marginTop;
    el.dataset.oldPaddingBottom = el.style.paddingBottom;
    el.dataset.oldMarginBottom = el.style.marginBottom;
    el.dataset.oldOverflow = el.style.overflow;
    el.style.maxHeight = `${el.scrollHeight}px`;
    el.style.overflow = 'hidden';
  }

  function leave(el: HTMLElement) {
    const gen = ++genRef.current;
    requestAnimationFrame(() => {
      if (el.scrollHeight !== 0) {
        el.style.maxHeight = '0';
        el.style.paddingTop = '0';
        el.style.paddingBottom = '0';
        el.style.marginTop = '0';
        el.style.marginBottom = '0';
      }

      const finish = () => {
        el.style.maxHeight = '';
        el.style.overflow = el.dataset.oldOverflow ?? '';
        el.style.paddingTop = el.dataset.oldPaddingTop ?? '';
        el.style.paddingBottom = el.dataset.oldPaddingBottom ?? '';
        el.style.display = 'none';
        el.removeEventListener('transitionend', onEnd);
        clearTimeout(fallback);
      };
      const onEnd = (e: Event) => {
        if (e.target !== el || genRef.current !== gen) return;
        finish();
      };

      const fallback = setTimeout(() => {
        if (genRef.current === gen) finish();
      }, 400);
      el.addEventListener('transitionend', onEnd);
    });
  }

  const setRef = useCallback((el: HTMLElement | null) => {
    elRef.current = el;
    if (el && initialRef.current) {
      initialRef.current = false;
      el.style.display = showRef.current ? '' : 'none';
    }
  }, []);

  const prevShowRef = useRef(show);
  useEffect(() => {
    const el = elRef.current;
    const wasShown = prevShowRef.current;
    prevShowRef.current = show;
    if (!el || wasShown === show) return;
    if (show) {
      el.style.display = '';
      beforeEnter(el);
      enter(el);
    } else {
      beforeLeave(el);
      leave(el);
    }
  }, [show]);

  return <ChildWithRef setRef={setRef}>{children}</ChildWithRef>;
}

import { cloneElement, isValidElement } from 'react';
function ChildWithRef({
  children,
  setRef,
}: {
  children: React.ReactNode;
  setRef: (el: HTMLElement | null) => void;
}) {
  if (!isValidElement(children)) return <>{children}</>;
  const child = children as React.ReactElement<{ ref?: unknown }>;
  return cloneElement(child, {
    ref: (el: HTMLElement | null) => {
      setRef(el);

      const own = (child as unknown as { ref?: { current: unknown } }).ref;
      if (own && typeof own === 'object') own.current = el;
    },
  });
}

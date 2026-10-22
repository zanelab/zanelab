import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ContentCompact } from '@zanelab/types';

interface VisibleDomRect {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
}

function getElementVisibleRect(element?: HTMLElement | null): VisibleDomRect {
  if (!element) {
    return { bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0 };
  }
  const rect = element.getBoundingClientRect();
  const viewHeight = Math.max(
    document.documentElement.clientHeight,
    window.innerHeight,
  );
  const top = Math.max(rect.top, 0);
  const bottom = Math.min(rect.bottom, viewHeight);
  const viewWidth = Math.max(
    document.documentElement.clientWidth,
    window.innerWidth,
  );
  const left = Math.max(rect.left, 0);
  const right = Math.min(rect.right, viewWidth);

  if (top >= viewHeight || bottom <= 0 || left >= viewWidth || right <= 0) {
    return { bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0 };
  }

  return {
    bottom,
    height: Math.max(0, bottom - top),
    left,
    right,
    top,
    width: Math.max(0, right - left),
  };
}

function useLayoutContentStyle(
  contentElement: React.RefObject<HTMLElement | null>,
) {
  const [visibleDomRect, setVisibleDomRect] = useState<VisibleDomRect | null>(
    null,
  );

  useEffect(() => {
    const element = contentElement.current;
    if (!element) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const debouncedCalc = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const rect = getElementVisibleRect(element);
        setVisibleDomRect(rect);

        document.documentElement.style.setProperty(
          '--layout-content-height',
          `${rect.height}px`,
        );
        document.documentElement.style.setProperty(
          '--layout-content-width',
          `${rect.width}px`,
        );
      }, 16);
    };

    const resizeObserver = new ResizeObserver(debouncedCalc);
    resizeObserver.observe(element);
    debouncedCalc();
    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [contentElement]);

  const overlayStyle: React.CSSProperties | undefined = visibleDomRect
    ? {
        height: `${visibleDomRect.height}px`,
        left: `${visibleDomRect.left}px`,
        position: 'fixed',
        top: `${visibleDomRect.top}px`,
        width: `${visibleDomRect.width}px`,
        zIndex: 150,
      }
    : undefined;

  return { overlayStyle };
}

interface LayoutContentProps {
  id: string;
  contentCompact: ContentCompact;
  contentCompactWidth: number;
  padding: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
  slotOverlay?: React.ReactNode;
}

export function LayoutContentCore({
  id,
  contentCompact,
  contentCompactWidth,
  padding,
  paddingTop,
  paddingBottom,
  paddingLeft,
  paddingRight,
  style,
  className,
  children,
  slotOverlay,
}: LayoutContentProps) {
  const contentElementRef = useRef<HTMLElement>(null);
  const { overlayStyle } = useLayoutContentStyle(contentElementRef);
  const isCompact = contentCompact === 'compact';

  const contentStyle: React.CSSProperties = {
    ...(isCompact
      ? { margin: '0 auto', width: `${contentCompactWidth}px` }
      : {}),
    flex: 1,
    padding: `${padding}px`,
    paddingBottom: `${paddingBottom}px`,
    paddingLeft: `${paddingLeft}px`,
    paddingRight: `${paddingRight}px`,
    paddingTop: `${paddingTop}px`,
    ...style,
  };

  return (
    <main
      id={id}
      ref={contentElementRef}

      className={`bg-background-deep relative overflow-auto ${className ?? ''}`}
      style={contentStyle}
    >
      {slotOverlay
        ? isValidElement(slotOverlay)
          ? cloneElement(
              slotOverlay as React.ReactElement<{
                style?: React.CSSProperties;
              }>,
              {
                style: {
                  ...overlayStyle,
                  ...(
                    slotOverlay as React.ReactElement<{
                      style?: React.CSSProperties;
                    }>
                  ).props.style,
                },
              },
            )
          : slotOverlay
        : null}
      {children}
    </main>
  );
}

import {
  useCallback,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

interface ScrollbarProps {
  children?: ReactNode;
  className?: string;
  horizontal?: boolean;
  shadow?: boolean;
  shadowBorder?: boolean;
  shadowBottom?: boolean;
  shadowLeft?: boolean;
  shadowRight?: boolean;
  shadowTop?: boolean;
  style?: CSSProperties;
  onScrollAt?: (state: {
    bottom: boolean;
    left: boolean;
    right: boolean;
    top: boolean;
  }) => void;
}

const ARRIVED_STATE_THRESHOLD_PIXELS = 1;

export function Scrollbar({
  children,
  className = '',
  horizontal = false,
  shadow = false,
  shadowBorder = false,
  shadowBottom = true,
  shadowLeft = false,
  shadowRight = false,
  shadowTop = true,
  style,
  onScrollAt,
}: ScrollbarProps) {
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [isAtLeft, setIsAtLeft] = useState(true);
  const [isAtRight, setIsAtRight] = useState(false);

  const showShadowTop = shadow && shadowTop;
  const showShadowBottom = shadow && shadowBottom;
  const showShadowLeft = shadow && shadowLeft;
  const showShadowRight = shadow && shadowRight;

  const computedShadowClasses = horizontal
    ? [
        !isAtLeft && !isAtRight && showShadowLeft && showShadowRight
          ? 'both-shadow'
          : '',
        !isAtLeft && showShadowLeft ? 'left-shadow' : '',
        !isAtRight && showShadowRight ? 'right-shadow' : '',
      ]
        .filter(Boolean)
        .join(' ')
    : '';

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLElement>) => {
      const target = event.currentTarget;
      const scrollTop = target?.scrollTop ?? 0;
      const scrollLeft = target?.scrollLeft ?? 0;
      const clientHeight = target?.clientHeight ?? 0;
      const clientWidth = target?.clientWidth ?? 0;
      const scrollHeight = target?.scrollHeight ?? 0;
      const scrollWidth = target?.scrollWidth ?? 0;
      const top = scrollTop <= 0;
      const left = scrollLeft <= 0;
      const bottom =
        Math.abs(scrollTop) + clientHeight >=
        scrollHeight - ARRIVED_STATE_THRESHOLD_PIXELS;
      const right =
        Math.abs(scrollLeft) + clientWidth >=
        scrollWidth - ARRIVED_STATE_THRESHOLD_PIXELS;

      setIsAtTop(top);
      setIsAtLeft(left);
      setIsAtBottom(bottom);
      setIsAtRight(right);

      onScrollAt?.({ bottom, left, right, top });
    },
    [onScrollAt],
  );

  return (
    <div
      className={`admin-scrollbar relative ${computedShadowClasses} ${className}`}
      style={style}
      onScroll={handleScroll}
    >
      {showShadowTop && (
        <div
          className={`scrollbar-top-shadow pointer-events-none sticky top-0 z-10 -mb-12 h-12 w-full opacity-0 transition-opacity duration-300 ease-in-out will-change-[opacity] ${
            !isAtTop ? 'opacity-100' : ''
          } ${shadowBorder && !isAtTop ? 'border-border border-t' : ''}`}
        />
      )}
      {children}
      {showShadowBottom && (
        <div
          className={`scrollbar-bottom-shadow pointer-events-none sticky bottom-0 z-10 -mt-12 h-12 w-full opacity-0 transition-opacity duration-300 ease-in-out will-change-[opacity] ${
            !isAtTop && !isAtBottom ? 'opacity-100' : ''
          } ${
            shadowBorder && !isAtTop && !isAtBottom
              ? 'border-border border-b'
              : ''
          }`}
        />
      )}
    </div>
  );
}

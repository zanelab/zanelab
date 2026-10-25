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

/** 等价于 上游 shared 工具包 的 getElementVisibleRect */
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

  // 如果元素完全不可见，则返回一个空的矩形
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

/**
 * useLayoutContentStyle — 1:1 port of @core/composables/use-layout-style.ts.
 * ResizeObserver（16ms 防抖）追踪内容区可见矩形，overlay 以 fixed 定位
 * 覆盖可见区域（zIndex 150），并写入 --layout-content-height/width CSS 变量。
 */
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
        // CSS 变量写入 documentElement（等价于 useCssVar 默认根作用域）
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

/**
 * LayoutContentCore — 1:1 port of layout-ui layout-content.vue.
 * padding 基础值 + 各方向独立覆盖；compact 时内容限宽居中（应用于 main 自身）。
 * overlay 槽位按可见矩形 fixed 定位（等价参考实现 的 overlayStyle）。
 *
 * overflow-auto（09-24 修复「内嵌子应用滚不动」）：main 高度由视口推导
 * （视口高 − 固定 header/tabbar），是确定值，可作为滚动容器。内嵌子应用
 * （npa-plt-system 老应用）自己的内容区按 `height: calc(100vh - 56px)` 计算
 * ——独立运行时正确，内嵌后比容器高，而 main 原本没有 overflow → 超出部分
 * 被裁掉且无处可滚。main 作为滚动容器后长页面可正常滚动（host 本地页面同样受益）。
 */
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
      // overflow-auto：内容区是滚动容器（理由见组件注释——内嵌子应用按
      // 100vh 计算高度，超出部分必须由这里承载滚动，否则底部内容滚不到）
      className={`bg-background-deep relative overflow-auto ${className ?? ''}`}
      style={contentStyle}
    >
      {/* overlay 槽位（layout-content.vue:58-60 的 reka-ui Slot 等价）：
          overlayStyle 合并进插槽内容的根元素，不引入包装 div —— 包装 div
          会以 fixed + z-150 常驻覆盖整个可见区域，即使插槽内容空闲
          （invisible）也拦截内容区点击；合并后可点击性由插槽内容自身
          控制（Spinner 空闲态 invisible = visibility:hidden，不响应指针；
          spinning 态可见并覆盖内容 = 加载阻断，与 reference 一致） */}
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

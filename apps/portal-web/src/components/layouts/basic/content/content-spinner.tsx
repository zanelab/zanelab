import { useEffect, useRef, useState } from 'react';
import { useContentSpinner } from './use-content-spinner';

/**
 * 上游 Spinner 组件 — 1:1 port of shadcn-ui spinner.vue.
 * spinning 时延迟 minLoadingTime 显示，backdrop-blur 覆盖层 +
 * 跳跃方块 loader（loader-jump-ani / loader-shadow-ani CSS 移植）。
 */
function Spinner({
  spinning,
  className = '',
  style,
}: {
  spinning: boolean;
  className?: string;
  /** 根元素 inline style —— 由 LayoutContentCore 的 overlay 槽位注入
      （fixed + z-150 的可见矩形定位）；等价参考实现 中 reka-ui Slot
      将 overlayStyle 合并到本组件根元素（Vue 属性透传到根 DOM） */
  style?: React.CSSProperties;
}) {
  const [showSpinner, setShowSpinner] = useState(false);
  const [renderSpinner, setRenderSpinner] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** 最小加载时间 */
  const minLoadingTime = 50;

  useEffect(() => {
    if (!spinning) {
      setShowSpinner(false);
      clearTimeout(timerRef.current);
      return;
    }
    timerRef.current = setTimeout(() => {
      setShowSpinner(true);
      setRenderSpinner(true);
    }, minLoadingTime);
    return () => clearTimeout(timerRef.current);
  }, [spinning]);

  return (
    <div
      className={`flex-center bg-overlay-content absolute top-0 left-0 z-100 size-full backdrop-blur-xs transition-all duration-500 ${
        showSpinner ? '' : 'invisible opacity-0'
      } ${className}`}
      style={style}
      onTransitionEnd={() => {
        if (!showSpinner) {
          setRenderSpinner(false);
        }
      }}
    >
      <style>{`
        .spinner-paused::before {
          animation-play-state: paused !important;
        }
        .spinner-paused::after {
          animation-play-state: paused !important;
        }
        .loader::before {
          animation: loader-shadow-ani 0.5s linear infinite;
        }
        .loader::after {
          animation: loader-jump-ani 0.5s linear infinite;
        }
        @keyframes loader-jump-ani {
          15% {
            border-bottom-right-radius: 3px;
          }
          25% {
            transform: translateY(9px) rotate(22.5deg);
          }
          50% {
            border-bottom-right-radius: 40px;
            transform: translateY(18px) scale(1, 0.9) rotate(45deg);
          }
          75% {
            transform: translateY(9px) rotate(67.5deg);
          }
          100% {
            transform: translateY(0) rotate(90deg);
          }
        }
        @keyframes loader-shadow-ani {
          0%, 100% {
            transform: scale(1, 1);
          }
          50% {
            transform: scale(1.2, 1);
          }
        }
      `}</style>
      {renderSpinner ? (
        <div
          className={`loader before:bg-primary/50 after:bg-primary relative size-12 before:absolute before:top-15 before:left-0 before:h-1.25 before:w-12 before:rounded-full before:content-[''] after:absolute after:top-0 after:left-0 after:h-full after:w-full after:rounded after:content-[''] ${
            renderSpinner ? '' : 'spinner-paused'
          }`}
        />
      ) : null}
    </div>
  );
}

/**
 * LayoutContentSpinner — 1:1 port of basic/content/content-spinner.vue.
 * 路由切换加载动画，由 useContentSpinner 驱动（transition.loading 偏好）。
 */
export function LayoutContentSpinner({
  style,
}: {
  /** 透传到 Spinner 根元素（Vue 属性透传的 React 等价 —— overlay 定位
      依赖此转发，见 Spinner 的 style 注释） */
  style?: React.CSSProperties;
}) {
  const { spinning } = useContentSpinner();

  return <Spinner spinning={spinning} style={style} />;
}

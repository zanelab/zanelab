import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../../icons/app-icon';

interface BackTopProps {
  /** 距离底部距离 */
  bottom?: number;

  /** 距离右侧距离 */
  right?: number;

  /** 触发滚动的目标元素选择器（缺省为 document） */
  target?: string;

  /** 滚动高度达到此值后才显示按钮 */
  visibilityHeight?: number;
}

/**
 * BackTop — 1:1 port of UI 库 BackTop.
 * 滚动超过 visibilityHeight 后显示，fade-down 过渡，支持 target 容器。
 */
export function BackTop({
  bottom = 20,
  right = 24,
  target = '',
  visibilityHeight = 200,
}: BackTopProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const elRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let el: HTMLElement = document.documentElement;
    let container: Document | HTMLElement = document;

    if (target) {
      const found = document.querySelector<HTMLElement>(target);
      if (!found) {
        // reference use-backtop.ts：target 无匹配时直接抛错
        throw new Error(`target does not exist: ${target}`);
      }
      el = found;
      container = found;
    }
    elRef.current = el;

    const handleScroll = () => {
      if (elRef.current) {
        setVisible(elRef.current.scrollTop >= (visibilityHeight ?? 0));
      }
    };

    // useThrottleFn(handleScroll, 300, /* trailing */ true) 等价：
    // leading 触发 + trailing 补发，不丢失最后一次滚动事件
    let lastExec = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handleScrollThrottled = () => {
      const now = Date.now();
      const remaining = 300 - (now - lastExec);
      if (remaining <= 0) {
        lastExec = now;
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        handleScroll();
      } else if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          lastExec = Date.now();
          handleScroll();
        }, remaining);
      }
    };

    container.addEventListener('scroll', handleScrollThrottled, {
      passive: true,
    });

    // Give visible an initial value
    handleScroll();
    return () => {
      container.removeEventListener('scroll', handleScrollThrottled);
      if (timer) clearTimeout(timer);
    };
  }, [target, visibilityHeight]);

  function handleClick() {
    elRef.current?.scrollTo({ behavior: 'smooth', top: 0 });
  }

  if (!visible) return null;

  return (
    <button
      type="button"
      className="fade-down-enter data bg-background text-foreground shadow-float hover:bg-heavy dark:bg-accent dark:hover:bg-heavy fixed size-10 rounded-full duration-500"
      style={{ bottom: `${bottom}px`, right: `${right}px`, zIndex: 1000 }}
      title={t('widgets.backTop')}
      onClick={handleClick}
    >
      <AppIcon name="arrow-up-to-line" className="size-4" />
    </button>
  );
}

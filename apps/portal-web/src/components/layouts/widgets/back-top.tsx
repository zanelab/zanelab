import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../../icons/app-icon';

interface BackTopProps {
  bottom?: number;

  right?: number;

  target?: string;

  visibilityHeight?: number;
}

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

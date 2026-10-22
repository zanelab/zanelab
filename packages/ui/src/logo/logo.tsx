import { useMemo } from 'react';
import type { MouseEventHandler, ReactNode } from 'react';

export interface LogoProps {
  collapsed?: boolean;

  fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';

  href?: string;

  logoSize?: number;

  src?: string;

  srcDark?: string;

  text: string;

  theme?: string;

  className?: string;
  onClick?: MouseEventHandler;

  slotText?: ReactNode;
}

export function Logo({
  collapsed = false,
  fit = 'cover',
  href,
  logoSize = 32,
  src = '',
  srcDark = '',
  text,
  theme = 'light',
  className = '',
  onClick,
  slotText,
}: LogoProps) {
  const logoSrc = useMemo(() => {
    if (theme === 'dark' && srcDark) {
      return srcDark;
    }

    return src;
  }, [theme, srcDark, src]);

  return (
    <div className={`${theme} flex h-full items-center text-lg`}>
      <a
        href={href ?? 'javascript:void(0)'}
        className={`flex h-full items-center gap-2 overflow-hidden px-3 text-lg leading-normal transition-all duration-500 ${className}`}
        onClick={onClick}
      >
        {logoSrc ? (
          <img
            alt={text}
            src={logoSrc}
            style={{ width: logoSize, height: logoSize, objectFit: fit }}
            className="relative rounded-none bg-transparent"
          />
        ) : null}
        {!collapsed
          ? (slotText ?? (
              <span className="text-foreground truncate font-semibold text-nowrap">
                {text}
              </span>
            ))
          : null}
      </a>
    </div>
  );
}

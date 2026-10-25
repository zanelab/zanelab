import { useMemo } from 'react';
import type { MouseEventHandler, ReactNode } from 'react';

/**
 * Logo — 1:1 port of UI 库 components/logo/logo.vue (上游 Logo 组件)。
 */
export interface LogoProps {
  /** 是否收起文本 */
  collapsed?: boolean;

  /** Logo 图片适应方式 */
  fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';

  /** Logo 跳转地址 */
  href?: string;

  /** Logo 图片大小 */
  logoSize?: number;

  src?: string;

  /** 暗色主题 Logo 图标（可选，若不设置则使用 src） */
  srcDark?: string;

  /** Logo 文本 */
  text: string;

  /** Logo 主题 */
  theme?: string;

  /** 透传 class（logoClass 等价） */
  className?: string;
  onClick?: MouseEventHandler;

  /** text 插槽（logo-text 等价） */
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
  // 根据主题选择合适的 logo 图标：暗色主题且提供了 srcDark 时用暗色版
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

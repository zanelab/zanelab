import type { ReactNode } from 'react';

/**
 * LayoutFooter — business footer wrapper.
 * Ported from packages/effects/layouts/src/basic/footer/footer.vue
 */
interface LayoutFooterProps {
  children?: ReactNode;
}

export function LayoutFooter({ children }: LayoutFooterProps) {
  return (
    <div className="text-base-content/60 relative flex size-full items-center justify-center text-xs">
      {children}
    </div>
  );
}

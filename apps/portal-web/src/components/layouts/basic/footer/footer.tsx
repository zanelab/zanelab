import type { ReactNode } from 'react';

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

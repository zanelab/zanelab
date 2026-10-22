import type { ReactNode } from 'react';

interface BlockProps {
  title?: string;
  children: ReactNode;
}

export function Block({ title, children }: BlockProps) {
  return (
    <div className="flex flex-col py-4">
      {title && (
        <h3 className="mb-3 leading-none font-semibold tracking-tight">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

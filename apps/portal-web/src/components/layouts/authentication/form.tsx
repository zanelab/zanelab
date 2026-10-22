import type { ReactNode } from 'react';

interface AuthFormViewProps {
  className?: string;

  dataSide?: 'bottom' | 'left' | 'right' | 'top';

  children?: ReactNode;

  copyright?: ReactNode;
}

export function AuthFormView({
  className = '',
  dataSide,
  children,
  copyright,
}: AuthFormViewProps) {
  return (
    <div
      className={`flex-col-center bg-background dark:bg-background-deep relative px-6 py-10 lg:flex-initial lg:px-8 ${className}`}
    >
      <div
        className="side-content mt-6 w-full sm:mx-auto md:max-w-md"
        data-side={dataSide}
      >
        {children}
      </div>

      <div className="text-muted-foreground absolute bottom-3 flex text-center text-xs">
        {copyright}
      </div>
    </div>
  );
}

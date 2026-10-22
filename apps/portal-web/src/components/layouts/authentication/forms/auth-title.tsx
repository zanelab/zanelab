import type { ReactNode } from 'react';

export function AuthTitle({
  children,
  slotDesc,
}: {
  children?: ReactNode;

  slotDesc?: ReactNode;
}) {
  return (
    <div className="mb-7 sm:mx-auto sm:w-full sm:max-w-md">
      <h2 className="text-foreground mb-3 text-3xl/9 font-bold tracking-tight lg:text-4xl">
        {children}
      </h2>
      <p className="lg:text-md text-muted-foreground text-sm">{slotDesc}</p>
    </div>
  );
}

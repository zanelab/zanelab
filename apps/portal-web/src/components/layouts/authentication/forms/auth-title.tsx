import type { ReactNode } from 'react';

/**
 * AuthTitle — 1:1 port of common-ui/ui/authentication/auth-title.vue.
 * 无脚本逻辑，纯展示：标题 + 描述（desc slot → slotDesc prop）。
 */
export function AuthTitle({
  children,
  slotDesc,
}: {
  /** 标题内容（default slot） */
  children?: ReactNode;

  /** 描述内容（#desc slot） */
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

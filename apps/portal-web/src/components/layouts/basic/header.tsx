interface LayoutHeaderProps {
  height: number;
  theme: string;
  show: boolean;
  fullWidth: boolean;
  width: string;
  zIndex: number;
  isMobile: boolean;
  sidebarWidth: number;
  children?: React.ReactNode;
  slotToggleButton?: React.ReactNode;
  slotLogo?: React.ReactNode;
}

/**
 * LayoutHeaderCore — 1:1 port of layout-ui layout-header.vue.
 * 隐藏时以负 marginTop 收起（保留占位参与过渡），而非直接卸载。
 */
export function LayoutHeaderCore({
  height,
  theme,
  show,
  fullWidth,
  zIndex,
  isMobile,
  sidebarWidth,
  children,
  slotToggleButton,
  slotLogo,
}: LayoutHeaderProps) {
  const style: React.CSSProperties = {
    height: `${height}px`,
    marginTop: show ? 0 : `-${height}px`,
    right: !show || !fullWidth ? undefined : 0,
    zIndex,
  };

  const logoStyle: React.CSSProperties = {
    minWidth: `${isMobile ? 40 : sidebarWidth}px`,
  };

  return (
    <header
      className={`${theme} border-border bg-header top-0 flex w-full flex-[0_0_auto] items-center border-b pl-2 transition-[margin-top] duration-200`}
      style={style}
    >
      {slotLogo ? <div style={logoStyle}>{slotLogo}</div> : null}

      {slotToggleButton}

      {children}
    </header>
  );
}

interface LayoutFooterProps {
  fixed: boolean;
  height: number;
  show: boolean;
  width: string;
  zIndex: number;
  children?: React.ReactNode;
}

export function LayoutFooterCore({
  fixed,
  height,
  show,
  width,
  zIndex,
  children,
}: LayoutFooterProps) {
  const style: React.CSSProperties = {
    height: `${height}px`,
    marginBottom: show ? '0' : `-${height}px`,
    position: fixed ? 'fixed' : 'static',
    width,
    zIndex,
  };

  return (
    <footer
      className="bg-background-deep bottom-0 w-full transition-all duration-200"
      style={style}
    >
      {children}
    </footer>
  );
}

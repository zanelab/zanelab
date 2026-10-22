interface LayoutTabbarProps {
  height: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export function LayoutTabbarCore({
  height,
  style,
  children,
}: LayoutTabbarProps) {
  return (
    <section
      className="border-border bg-background flex w-full border-b transition-all"
      style={{ height: `${height}px`, ...style }}
    >
      {children}
    </section>
  );
}

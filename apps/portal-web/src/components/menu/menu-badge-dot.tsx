interface BadgeDotProps {
  dotClass?: string;
  dotStyle?: React.CSSProperties;
}

export function MenuBadgeDot({ dotClass = '', dotStyle = {} }: BadgeDotProps) {
  return (
    <span className="relative mr-1 flex size-1.5">
      <span
        className={`absolute inline-flex size-full animate-ping rounded-full opacity-75 ${dotClass}`}
        style={dotStyle}
      />
      <span
        className={`relative inline-flex size-1.5 rounded-full ${dotClass}`}
        style={dotStyle}
      />
    </span>
  );
}

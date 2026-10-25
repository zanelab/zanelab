import { isValidColor } from '@zanelab/utils';
import { MenuBadgeDot } from './menu-badge-dot';

interface MenuBadgeProps {
  badge?: string | number;
  badgeType?: 'dot' | string;
  badgeVariants?:
    | 'default'
    | 'destructive'
    | 'primary'
    | 'success'
    | 'warning'
    | (string & {});
  hasChildren?: boolean;
  className?: string;
}

const variantsMap: Record<string, string> = {
  default: 'bg-green-500',
  destructive: 'bg-destructive',
  primary: 'bg-primary',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
};

export function MenuBadge({
  badge,
  badgeType,
  badgeVariants,
  className = '',
}: MenuBadgeProps) {
  const isDot = badgeType === 'dot';

  if (!isDot && !badge) return null;

  const badgeClass = badgeVariants
    ? variantsMap[badgeVariants] || badgeVariants
    : variantsMap.default;

  // badgeStyle（reference menu-badge.vue:33-38）：badgeClass 是合法颜色时
  // 以内联 backgroundColor 呈现（支持任意 CSS 颜色自定义徽章色）
  const badgeStyle: React.CSSProperties =
    badgeClass && isValidColor(badgeClass)
      ? { backgroundColor: badgeClass }
      : {};

  return (
    <span className={`absolute ${className}`}>
      {isDot ? (
        <MenuBadgeDot dotClass={badgeClass} dotStyle={badgeStyle} />
      ) : (
        <div
          className={`flex-center text-primary-foreground rounded-xl px-1.5 py-0.5 text-[10px] ${badgeClass}`}
          style={badgeStyle}
        >
          {badge}
        </div>
      )}
    </span>
  );
}

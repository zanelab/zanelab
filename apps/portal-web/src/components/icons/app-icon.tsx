import type { MouseEventHandler, ReactNode } from 'react';
import { useIconStore } from '../../stores/icon-store';
import { BUILTIN_ICONS } from './builtin-icons';
import type { IconData } from '@zanelab/types';

const SVG_PROPS = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function IconSvg({
  data,
  className,
  onClick,
}: {
  data: IconData;
  className?: string;
  onClick?: MouseEventHandler<SVGSVGElement>;
}) {
  const useFill = !!data.fill;
  return (
    <svg
      className={className}
      viewBox={data.viewBox ?? '0 0 24 24'}
      onClick={onClick}
      {...(useFill ? { fill: data.fill } : SVG_PROPS)}
    >
      {data.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

function resolveIconData(
  name: string,
  runtime: Record<string, IconData>,
): IconData | null {
  if (runtime[name]) return runtime[name];
  if (BUILTIN_ICONS[name]) return BUILTIN_ICONS[name];
  if (name.startsWith('svg:')) {
    const paths = name
      .slice(4)
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);
    if (paths.length) return { paths };
  }
  return null;
}

export function AppIcon({
  name,
  className,
  onClick,
}: {
  name?: string;
  className?: string;
  onClick?: MouseEventHandler<SVGSVGElement>;
}) {
  const runtimeIcons = useIconStore((s) => s.icons);
  if (!name) return null;
  const data = resolveIconData(name, runtimeIcons);
  if (!data) return null;
  return <IconSvg data={data} className={className} onClick={onClick} />;
}

export function renderMenuIcon(
  icon: string | ReactNode,
  className?: string,
): ReactNode {
  if (typeof icon === 'string') {
    return <AppIcon name={icon} className={className} />;
  }
  return icon;
}

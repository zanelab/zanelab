import type { MouseEventHandler, ReactNode } from 'react';
import { useIconStore } from '../../stores/icon-store';
import { BUILTIN_ICONS } from './builtin-icons';
import type { IconData } from '@zanelab/types';

/**
 * AppIcon — 后端菜单 icon 标识符 → path-data SVG 的单一解析入口
 * （09-08-icon-registry）。解析顺序：
 *   ① 运行时注册表（config.js icons / iconPackUrl / window.__registerIcons）
 *   ② 内置表（BUILTIN_ICONS）
 *   ③ `svg:` 前缀直通（标识符即 path data，`svg:` 后多段用 `|` 分隔）
 *   ④ null（未命中：无图标，布局不塌、无文本泄漏）
 *
 * 渲染 stroke=currentColor strokeWidth=2（与项目手写 SVG 同构），跟主题色。
 */

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
  // fill 模式（iconfont 风格）：用 fill 渲染、不设 stroke；
  // stroke 模式（项目默认）：fill none + stroke currentColor
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

/** 标识符 → IconData；`svg:` 直通把标识符剩余部分按 path data 解析 */
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

/**
 * AppIcon — 图标标识符 → path-data SVG 的单一渲染入口。
 * 事件透传：图标本身作为交互元素的场景（如 tabbar 的关闭/图钉）可直接挂 onClick，
 * 渲染结果与原内联 SVG 同构。
 */
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

/**
 * menu 组件的双态 icon（MenuRecordRaw.icon: string | ReactNode）：
 * 标识符 → AppIcon 解析；ReactNode（含 JSX）原样透传。
 */
export function renderMenuIcon(
  icon: string | ReactNode,
  className?: string,
): ReactNode {
  if (typeof icon === 'string') {
    return <AppIcon name={icon} className={className} />;
  }
  return icon;
}

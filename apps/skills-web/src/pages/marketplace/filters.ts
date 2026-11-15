import type { OutputType, SkillItem, SkillSort } from './data';

/**
 * 市场筛选/排序纯函数（与组件分离，便于单测）。
 *
 * - 筛选：组内 OR（同组任一命中即保留）、组间 AND——与常见分面筛选语义一致，
 *   也与参考稿交互对齐（勾「网页+视频」= 输出类型二选一，再与角色条件求交）。
 * - **按组 id 分派**：每个值只在所属组的字段里匹配。角色/场景/输出类型的 value
 *   都是中文字符串，宽松的「任一字段命中」会让不同组的值交叉命中（语义边界靠不住）。
 * - free/featured 组的 value 映射 SkillItem 的布尔字段。
 * - 排序：recommended 保持种子序（编辑推荐位），其余按数值/日期降序。
 */

/** 活跃筛选：组 id → 勾选值列表 */
export type ActiveFilters = Record<string, string[]>;

/** free/featured 组值 → SkillItem 布尔字段名 */
const FLAG_FIELD: Record<string, 'free' | 'featured'> = {
  free: 'free',
  featured: 'featured',
};

/** 单个值是否命中该技能；未知组不命中（宁可空结果，也不跨组误配）。 */
function matchesValue(group: string, value: string, skill: SkillItem): boolean {
  switch (group) {
    case 'free': {
      const field = FLAG_FIELD[value];
      return field ? skill[field] : false;
    }
    case 'output':
      return skill.outputTypes.includes(value as OutputType);
    case 'role':
      return skill.roles.includes(value);
    case 'scene':
      return skill.scenes.includes(value);
    default:
      return false;
  }
}

export function filterSkills(
  skills: SkillItem[],
  active: ActiveFilters,
): SkillItem[] {
  return skills.filter((skill) =>
    Object.entries(active).every(([group, values]) => {
      if (values.length === 0) return true;
      return values.some((value) => matchesValue(group, value, skill));
    }),
  );
}

export function sortSkills(skills: SkillItem[], sort: SkillSort): SkillItem[] {
  const copy = [...skills];
  switch (sort) {
    case 'latest':
      return copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    case 'popular':
      return copy.sort((a, b) => b.downloads - a.downloads);
    case 'rating':
      return copy.sort(
        (a, b) => b.rating - a.rating || b.downloads - a.downloads,
      );
    case 'recommended':
    default:
      return copy;
  }
}

/** 筛选值切换（勾选/取消）；返回新映射，不突变入参。 */
export function toggleFilter(
  active: ActiveFilters,
  group: string,
  value: string,
): ActiveFilters {
  const current = active[group] ?? [];
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
  return { ...active, [group]: next };
}

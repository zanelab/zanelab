import {
  AGENT_LABEL,
  type OutputType,
  type SkillItem,
  type SkillSort,
} from './data';

/**
 * 市场筛选/搜索/排序纯函数（与组件分离，便于单测）。
 *
 * - 筛选：组内 OR（同组任一命中即保留）、组间 AND——与常见分面筛选语义一致，
 *   也与参考稿交互对齐（勾「网页+视频」= 输出类型二选一，再与角色条件求交）。
 * - **按组 id 分派**：每个值只在所属组的字段里匹配。角色/场景/输出类型的 value
 *   都是中文字符串、agent 的 value 是 CC/CX/AG/CU 这类缩写码，宽松的「任一字段
 *   命中」会让不同组的值交叉命中（语义边界靠不住）。
 * - free/featured 组的 value 映射 SkillItem 的布尔字段。
 * - 搜索：对 title + outputTypes/roles/scenes/agents 做不区分大小写的子串匹配；
 *   与筛选是 AND 关系（组合顺序 filter → search → sort，见 marketplace.tsx）。
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
    case 'agent':
      // 独立分支（按组 id 分派）：CC/CX/AG/CU 这类缩写码绝不能落到上面几个
      // 中文字段里做宽松匹配，否则「Cursor」之类值迟早交叉命中
      return skill.agents.includes(value);
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

/**
 * 关键词搜索（R4）：title 与 outputTypes / roles / scenes / agents 逐元素做
 * 不区分大小写的子串匹配。空查询（含全空白）**原样返回同一引用**——保持引用
 * 相等，避免 useMemo 下游做无谓重排/重渲染。
 *
 * agents 同时匹配**缩写码与其全称**（AGENT_LABEL：CU → Cursor）：design.md 的
 * 字段清单只写了 `agents`（码），但用户按常识会输入「Codex」「Cursor」而不是
 * 「CX」——按码匹配等于搜不到。全称是 code 的语义展开（同一事实源 data.ts 提供），
 * 属设计字段清单的**超集**，不改变「按码也能搜」的行为。
 */
export function searchSkills(skills: SkillItem[], query: string): SkillItem[] {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return skills;
  return skills.filter((skill) =>
    [
      skill.title,
      ...skill.outputTypes,
      ...skill.roles,
      ...skill.scenes,
      ...skill.agents,
      ...skill.agents.map((agent) => AGENT_LABEL[agent] ?? agent),
    ].some((field) => field.toLowerCase().includes(keyword)),
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

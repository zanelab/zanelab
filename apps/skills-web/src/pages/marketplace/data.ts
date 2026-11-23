/**
 * Agent Skills 市场页类型与筛选选项（数据源已接接口，任务 11-23-skills-crud-mock）。
 *
 * 结构对齐参考稿（Agent Skills 市场）：技能卡片 { 缩略图基调, 免费, 下载/收藏数,
 * 兼容 Agent, 角色/场景标签 } + 五组筛选 { 免费/精选、输出类型、角色、使用场景、按 Agent } + 排序。
 * 列表数据经 skillsApi 拉取（接口行 → SkillItem 见 record.ts）；静态种子迁
 * supabase/migrations/0002 与 mocks/skill-handlers.ts（同源两份）。
 */

export type OutputType = '网页' | '幻灯片' | '视频' | '图像';

export type SkillSort = 'recommended' | 'latest' | 'popular' | 'rating';

/** 筛选选项；icon 为 BUILTIN_ICONS 标识符，只有需要前置图标的分组才填。
 *  **不存文案**：label 在渲染期经 t() 派生（key = skills.option.<group>.<value>），
 *  值域含中文（角色/场景/输出类型）——中文值是数据键（稳定、随数据走），不是文案。 */
export interface SkillFilterOption {
  value: string;
  count: number;
  icon?: string;
}

/** 筛选组 id；'scene' 见 research/reference-skillry-marketplace.md 差异 #10，
 *  'agent' 见 11-16 决策 D9/R7（agents 提升为可筛选维度）。
 *  **不存 title 文案**：分组标题渲染期 t(`skills.group.${id}`) 派生。 */
export interface SkillFilterGroup {
  id: 'free' | 'featured' | 'output' | 'role' | 'scene' | 'agent';
  /** 选项；value 即 SkillItem 上的匹配键 */
  options: SkillFilterOption[];
}

export interface SkillItem {
  /** 行 id（DB bigint identity，number——回传编辑/删除 API 直接用） */
  id: number;
  title: string;
  free: boolean;
  featured: boolean;
  outputTypes: OutputType[];
  roles: string[];
  /** 按使用场景（与 roles 同形，独立分组匹配，不与角色值交叉命中） */
  scenes: string[];
  downloads: number;
  bookmarks: number;
  /** 1–5 整数（演示数据；rating 排序用） */
  rating: number;
  /** 更新时间 ISO 日期（latest 排序用） */
  updatedAt: string;
  /** 卡片缩略图占位图的语义色基调（bg-<tone> Tailwind 类名段） */
  tone: 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning';
  /** 兼容 Agent 徽标（缩写，如 CC = Claude Code） */
  agents: string[];
}

export const SORT_OPTIONS: Array<{ value: SkillSort }> = [
  { value: 'recommended' },
  { value: 'latest' },
  { value: 'popular' },
  { value: 'rating' },
];

/**
 * 兼容 Agent 缩写 → 全称（卡片头像组的 title 提示 + 「按 Agent」筛选组的标签）。
 * 单一事实源：卡片（skill-card.tsx）与筛选组都从这里取，不留第二份。
 */
export const AGENT_LABEL: Record<string, string> = {
  CC: 'Claude Code',
  CX: 'Codex',
  AG: 'Antigravity',
  CU: 'Cursor',
};

/** 「按 Agent」各选项的计数（演示数值，与其余组的既有口径一致） */
const AGENT_COUNT: Record<string, number> = {
  CC: 96,
  CX: 74,
  AG: 58,
  CU: 41,
};

export const FILTER_GROUPS: SkillFilterGroup[] = [
  {
    id: 'free',
    // 参考稿首组标题即「推荐」（与排序胶囊的「推荐」同名）；首组无上分隔线，
    // 见 filter-sidebar.tsx 的 first-of-type:border-t-0
    options: [
      { value: 'free', count: 42 },
      { value: 'featured', count: 109 },
    ],
  },
  {
    id: 'output',
    // 参考稿：仅本组选项行有 14px 前置图标（图形 = 输出媒介），其它分组无
    options: [
      { value: '网页', count: 116, icon: 'monitor' },
      { value: '幻灯片', count: 61, icon: 'presentation' },
      { value: '视频', count: 360, icon: 'video' },
      { value: '图像', count: 83, icon: 'photo' },
    ],
  },
  {
    id: 'role',
    options: [
      { value: '内容创作者', count: 194 },
      { value: '创始人', count: 349 },
      { value: '电商卖家', count: 245 },
      { value: '设计师', count: 185 },
      { value: '顾问', count: 15 },
      { value: '教师', count: 62 },
      { value: '营销人员', count: 48 },
      { value: '研究人员', count: 22 },
    ],
  },
  {
    id: 'scene',
    options: [
      { value: '内容与编辑发布', count: 151 },
      { value: '知识解释与教学', count: 36 },
      { value: '品牌建立与视觉规范', count: 59 },
      { value: '社交内容与营销活动', count: 51 },
    ],
  },
  {
    // 11-16 R7/D9：agents 由「只画在卡片上」提升为可筛选维度。参考站的「按 Agent」
    // 只出现在分类下拉里，本组侧栏也渲染——这是用户明确选择的行为，不是照搬参考站。
    // 选项由 AGENT_LABEL 派生（value = 缩写码 CC/CX/AG/CU；label = 全称，
    // 品牌名不翻译，渲染期直接用 AGENT_LABEL[value]）。
    id: 'agent',
    options: Object.entries(AGENT_LABEL).map(([value]) => ({
      value,
      count: AGENT_COUNT[value] ?? 0,
    })),
  },
];

/**
 * 分类下拉的分组顺序（参考站下拉实测：按使用场景 → 按角色 → 按输出类型 → 按 Agent）。
 * 刻意**不**直接遍历 FILTER_GROUPS：后者含页内侧栏独有的「推荐（免费/精选）」，
 * 参考站下拉里没有该组。与侧栏顺序（原序 + agent 追加末位）不同是有意的，
 * 各有依据（见 design.md「两组顺序」）。
 */
export const CATEGORY_MENU_ORDER: Array<SkillFilterGroup['id']> = [
  'scene',
  'role',
  'output',
  'agent',
];

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
 *  值域含中文（角色/场景/输出类型）——中文值是数据键（稳定、随数据走），不是文案。
 *  **不存 count**：计数由 marketplace 按当前技能数据实时统计（computeFilterCounts），
 *  硬编码演示值与真实数据脱节（任务 11-26 移除）。 */
export interface SkillFilterOption {
  value: string;
  icon?: string;
}

/** 筛选组 id；'scene' 见 research/reference-skillry-marketplace.md 差异 #10，
 *  'agent' 见 11-16 决策 D9/R7（agents 提升为可筛选维度）。
 *  **不存 title 文案**：分组标题渲染期 t(`skills.group.${id}`) 派生。 */
export interface SkillFilterGroup {
  id: 'free' | 'output' | 'role' | 'scene' | 'agent';
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
 * 值域取参考站 agent 目录页（skillry.dev/zh/skills/agent）前 10 项（任务 11-26，
 * 完整 33 行底稿见任务 research/skillry-agents.md——后续 agent 目录页复用）：
 * 缩写码为可读性优先的两字母首拟（GH = GitHub Copilot、GC = Gemini CLI、
 * OC = OpenCode、OB = OpenClaw、HA = Hermes Agent、KI = Kiro），是数据键不是文案。
 */
export const AGENT_LABEL: Record<string, string> = {
  CC: 'Claude Code',
  CX: 'Codex',
  CU: 'Cursor',
  GH: 'GitHub Copilot',
  GC: 'Gemini CLI',
  OC: 'OpenCode',
  AG: 'Antigravity',
  OB: 'OpenClaw',
  HA: 'Hermes Agent',
  KI: 'Kiro',
};

export const FILTER_GROUPS: SkillFilterGroup[] = [
  {
    id: 'free',
    // 参考稿首组标题即「推荐」（与排序胶囊的「推荐」同名）；首组无上分隔线，
    // 见 filter-sidebar.tsx 的 first-of-type:border-t-0
    options: [{ value: 'free' }, { value: 'featured' }],
  },
  {
    id: 'output',
    // 参考稿：仅本组选项行有 14px 前置图标（图形 = 输出媒介），其它分组无
    options: [
      { value: '网页', icon: 'monitor' },
      { value: '幻灯片', icon: 'presentation' },
      { value: '视频', icon: 'video' },
      { value: '图像', icon: 'photo' },
    ],
  },
  {
    id: 'role',
    // 值域对齐参考站「By role」8 项（任务 11-26）；中文值是数据键不是文案
    options: [
      { value: '内容创作者' },
      { value: '创始人' },
      { value: '电商卖家' },
      { value: '设计师' },
      { value: '顾问' },
      { value: '教师' },
      { value: '营销人员' },
      { value: '研究人员' },
    ],
  },
  {
    id: 'scene',
    // 值域对齐参考站「By use case」8 项（任务 11-26）：网页设计/产品发布/品牌识别/
    // 客户汇报/社交媒体/研究传播/教学讲解/内容发布；旧 4 值由迁移 0005 幂等折进
    options: [
      { value: '网页设计' },
      { value: '产品发布' },
      { value: '品牌识别' },
      { value: '客户汇报' },
      { value: '社交媒体' },
      { value: '研究传播' },
      { value: '教学讲解' },
      { value: '内容发布' },
    ],
  },
  {
    // 11-16 R7/D9：agents 由「只画在卡片上」提升为可筛选维度。参考站的「按 Agent」
    // 只出现在分类下拉里，本组侧栏也渲染——这是用户明确选择的行为，不是照搬参考站。
    // 选项由 AGENT_LABEL 派生（value = 缩写码；label = 全称，品牌名不翻译，
    // 渲染期直接用 AGENT_LABEL[value]）。10 项对齐参考站（任务 11-26）。
    id: 'agent',
    options: Object.keys(AGENT_LABEL).map((value) => ({ value })),
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

/**
 * 侧栏筛选计数：按当前技能数据实时统计（任务 11-26——替代原硬编码演示值）。
 * 口径：free/featured 按布尔列；output/role/scene 按数组命中（一条技能可同时
 * 命中组内多个选项，各组独立计数）；agent 按 agents 数组含缩写码。
 * 返回 Record<groupId, Record<value, count>>，缺省组/值为 0。
 */
export function computeFilterCounts(
  skills: SkillItem[],
): Record<SkillFilterGroup['id'], Record<string, number>> {
  const counts: Record<SkillFilterGroup['id'], Record<string, number>> = {
    free: { free: 0, featured: 0 },
    output: {},
    role: {},
    scene: {},
    agent: {},
  };
  for (const skill of skills) {
    if (skill.free) counts.free.free += 1;
    if (skill.featured) counts.free.featured += 1;
    for (const value of skill.outputTypes)
      counts.output[value] = (counts.output[value] ?? 0) + 1;
    for (const value of skill.roles)
      counts.role[value] = (counts.role[value] ?? 0) + 1;
    for (const value of skill.scenes)
      counts.scene[value] = (counts.scene[value] ?? 0) + 1;
    for (const value of skill.agents)
      counts.agent[value] = (counts.agent[value] ?? 0) + 1;
  }
  return counts;
}

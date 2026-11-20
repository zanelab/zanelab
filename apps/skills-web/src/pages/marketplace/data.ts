/**
 * Agent Skills 市场静态数据（首页 MVP，无后端）。
 *
 * 结构对齐参考稿（Agent Skills 市场）：技能卡片 { 缩略图基调, 免费, 下载/收藏数,
 * 兼容 Agent, 角色/场景标签 } + 五组筛选 { 免费/精选、输出类型、角色、使用场景、按 Agent } + 排序。
 * 数值/分类为演示数据；接真后端时本文件只保留类型，种子迁接口层。
 */

export type OutputType = '网页' | '幻灯片' | '视频' | '图像';

export type SkillSort = 'recommended' | 'latest' | 'popular' | 'rating';

/** 筛选选项；icon 为 BUILTIN_ICONS 标识符，只有需要前置图标的分组才填 */
export interface SkillFilterOption {
  value: string;
  label: string;
  count: number;
  icon?: string;
}

/** 筛选组 id；'scene' 见 research/reference-skillry-marketplace.md 差异 #10，
 *  'agent' 见 11-16 决策 D9/R7（agents 提升为可筛选维度） */
export interface SkillFilterGroup {
  id: 'free' | 'featured' | 'output' | 'role' | 'scene' | 'agent';
  title: string;
  /** 选项；value 即 SkillItem 上的匹配键 */
  options: SkillFilterOption[];
}

export interface SkillItem {
  id: string;
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

export const SORT_OPTIONS: Array<{ value: SkillSort; label: string }> = [
  { value: 'recommended', label: '推荐' },
  { value: 'latest', label: '最新发布' },
  { value: 'popular', label: '热门' },
  { value: 'rating', label: '评分最高' },
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
    title: '推荐',
    options: [
      { value: 'free', label: '免费', count: 42 },
      { value: 'featured', label: '精选', count: 109 },
    ],
  },
  {
    id: 'output',
    title: '按输出类型',
    // 参考稿：仅本组选项行有 14px 前置图标（图形 = 输出媒介），其它分组无
    options: [
      { value: '网页', label: '网页', count: 116, icon: 'monitor' },
      { value: '幻灯片', label: '幻灯片', count: 61, icon: 'presentation' },
      { value: '视频', label: '视频', count: 360, icon: 'video' },
      { value: '图像', label: '图像', count: 83, icon: 'photo' },
    ],
  },
  {
    id: 'role',
    title: '按角色',
    options: [
      { value: '内容创作者', label: '内容创作者', count: 194 },
      { value: '创始人', label: '创始人', count: 349 },
      { value: '电商卖家', label: '电商卖家', count: 245 },
      { value: '设计师', label: '设计师', count: 185 },
      { value: '顾问', label: '顾问', count: 15 },
      { value: '教师', label: '教师', count: 62 },
      { value: '营销人员', label: '营销人员', count: 48 },
      { value: '研究人员', label: '研究人员', count: 22 },
    ],
  },
  {
    id: 'scene',
    title: '按使用场景',
    options: [
      { value: '内容与编辑发布', label: '内容与编辑发布', count: 151 },
      { value: '知识解释与教学', label: '知识解释与教学', count: 36 },
      { value: '品牌建立与视觉规范', label: '品牌建立与视觉规范', count: 59 },
      { value: '社交内容与营销活动', label: '社交内容与营销活动', count: 51 },
    ],
  },
  {
    // 11-16 R7/D9：agents 由「只画在卡片上」提升为可筛选维度。参考站的「按 Agent」
    // 只出现在分类下拉里，本组侧栏也渲染——这是用户明确选择的行为，不是照搬参考站。
    // 选项由 AGENT_LABEL 派生（value = 缩写码 CC/CX/AG/CU，label = 全称）。
    id: 'agent',
    title: '按 Agent',
    options: Object.entries(AGENT_LABEL).map(([value, label]) => ({
      value,
      label,
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

export const SKILLS: SkillItem[] = [
  {
    id: 'landing-dark',
    title: '薄荷暗夜软件产品官网',
    free: true,
    featured: false,
    outputTypes: ['网页'],
    roles: ['创始人', '设计师'],
    scenes: ['品牌建立与视觉规范'],
    downloads: 340,
    bookmarks: 6,
    rating: 5,
    updatedAt: '2026-11-10',
    tone: 'primary',
    agents: ['CC', 'CX', 'AG', 'CU'],
  },
  {
    id: 'bike-store',
    title: '橙焙电单车商店',
    free: true,
    featured: false,
    outputTypes: ['网页', '图像'],
    roles: ['电商卖家'],
    scenes: ['社交内容与营销活动', '内容与编辑发布'],
    downloads: 241,
    bookmarks: 8,
    rating: 5,
    updatedAt: '2026-11-08',
    tone: 'warning',
    agents: ['CC', 'CX', 'AG', 'CU'],
  },
  {
    id: 'green-pharmacy',
    title: '清新绿药房商店',
    free: true,
    featured: false,
    outputTypes: ['网页'],
    roles: ['电商卖家'],
    scenes: ['社交内容与营销活动'],
    downloads: 209,
    bookmarks: 7,
    rating: 4,
    updatedAt: '2026-11-05',
    tone: 'success',
    agents: ['CC', 'CX', 'AG', 'CU'],
  },
  {
    id: 'greeting-cards',
    title: '贴纸闪赠礼应用网站',
    free: true,
    featured: false,
    outputTypes: ['网页', '图像'],
    roles: ['设计师', '内容创作者'],
    scenes: ['品牌建立与视觉规范', '社交内容与营销活动'],
    downloads: 207,
    bookmarks: 5,
    rating: 5,
    updatedAt: '2026-11-01',
    tone: 'secondary',
    agents: ['CC', 'CX', 'AG', 'CU'],
  },
  {
    id: 'marker-studio',
    title: '马克笔涂鸦品牌工作室',
    free: true,
    featured: false,
    outputTypes: ['网页', '图像'],
    roles: ['设计师', '创始人'],
    scenes: ['品牌建立与视觉规范'],
    downloads: 186,
    bookmarks: 7,
    rating: 4,
    updatedAt: '2026-10-28',
    tone: 'accent',
    agents: ['CC', 'CX', 'AG', 'CU'],
  },
  {
    id: 'saas-docs',
    title: '轨道协作落地站',
    free: true,
    featured: false,
    outputTypes: ['网页'],
    roles: ['创始人', '营销人员'],
    scenes: ['内容与编辑发布'],
    downloads: 203,
    bookmarks: 2,
    rating: 4,
    updatedAt: '2026-10-25',
    tone: 'info',
    agents: ['CC', 'CX', 'AG', 'CU'],
  },
  {
    id: 'portfolio-dark',
    title: '黑白设计师作品集',
    free: true,
    featured: false,
    outputTypes: ['网页'],
    roles: ['设计师'],
    scenes: ['品牌建立与视觉规范'],
    downloads: 184,
    bookmarks: 4,
    rating: 5,
    updatedAt: '2026-10-21',
    tone: 'primary',
    agents: ['CC', 'CX', 'AG', 'CU'],
  },
  {
    id: 'resume-frame',
    title: '青柠边框设计师作品集',
    free: true,
    featured: false,
    outputTypes: ['网页'],
    roles: ['设计师', '研究人员'],
    scenes: ['品牌建立与视觉规范'],
    downloads: 178,
    bookmarks: 6,
    rating: 4,
    updatedAt: '2026-10-18',
    tone: 'secondary',
    agents: ['CC', 'CX', 'AG', 'CU'],
  },
  {
    id: 'beverage-site',
    title: '方格纸饮品品牌网站',
    free: true,
    featured: false,
    outputTypes: ['网页'],
    roles: ['创始人', '营销人员'],
    scenes: ['社交内容与营销活动'],
    downloads: 177,
    bookmarks: 4,
    rating: 4,
    updatedAt: '2026-10-15',
    tone: 'warning',
    agents: ['CC', 'CX', 'AG', 'CU'],
  },
  {
    id: 'pet-store',
    title: '宝蓝宠物用品商店',
    free: true,
    featured: false,
    outputTypes: ['网页', '图像'],
    roles: ['电商卖家'],
    scenes: ['社交内容与营销活动', '内容与编辑发布'],
    downloads: 176,
    bookmarks: 4,
    rating: 5,
    updatedAt: '2026-10-12',
    tone: 'primary',
    agents: ['CC', 'CX', 'AG', 'CU'],
  },
  {
    id: 'pitch-deck',
    title: '融资路演幻灯片生成',
    free: false,
    featured: true,
    outputTypes: ['幻灯片'],
    roles: ['创始人', '顾问'],
    scenes: ['知识解释与教学', '内容与编辑发布'],
    downloads: 452,
    bookmarks: 31,
    rating: 5,
    updatedAt: '2026-11-11',
    tone: 'info',
    agents: ['CC', 'CX'],
  },
  {
    id: 'product-video',
    title: '短视频产品口播脚本',
    free: false,
    featured: true,
    outputTypes: ['视频'],
    roles: ['营销人员', '内容创作者'],
    scenes: ['社交内容与营销活动', '内容与编辑发布'],
    downloads: 388,
    bookmarks: 22,
    rating: 4,
    updatedAt: '2026-11-09',
    tone: 'secondary',
    agents: ['CC', 'AG'],
  },
  {
    id: 'illustration-set',
    title: '品牌插画批量生成',
    free: true,
    featured: false,
    outputTypes: ['图像'],
    roles: ['设计师', '内容创作者'],
    scenes: ['品牌建立与视觉规范'],
    downloads: 301,
    bookmarks: 15,
    rating: 4,
    updatedAt: '2026-11-03',
    tone: 'accent',
    agents: ['CC', 'CX', 'CU'],
  },
  {
    id: 'course-slides',
    title: '课堂教学课件助手',
    free: true,
    featured: false,
    outputTypes: ['幻灯片'],
    roles: ['教师', '研究人员'],
    scenes: ['知识解释与教学'],
    downloads: 156,
    bookmarks: 9,
    rating: 5,
    updatedAt: '2026-10-30',
    tone: 'success',
    agents: ['CC'],
  },
];

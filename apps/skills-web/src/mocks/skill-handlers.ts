import { delay, http, HttpResponse } from 'msw';
import {
  INTEGRATION_PREFIX,
  SKILLS_COLLECTION_PATH,
  SKILLS_ITEM_PATH,
} from '../api/endpoints';
/** Edge fn 响应行形态（snake_case 原样透传，镜像 DB 列）；api 层负责归一。 */
interface RawSkillRow {
  id: number;
  title: string;
  free: boolean;
  featured: boolean;
  output_types: string[];
  roles: string[];
  scenes: string[];
  downloads: number;
  bookmarks: number;
  rating: number;
  tone: string;
  agents: string[];
  created_at: string;
  updated_at: string;
  // —— 详情页字段（11-24）——
  version: string;
  task_expression: string;
  summary: string;
  description: string;
  price_kind: 'free' | 'paid' | 'requires_key';
  price_amount: number | null;
  price_note: string;
  requires_api_key: string[];
  likes: number;
  score: number | null;
  reviews_count: number;
  media: unknown[];
  demo_examples: unknown[];
  deliverables: string[];
  good_fit: string[];
  not_for: string[];
  requirements: Record<string, unknown>;
  tags: Record<string, unknown>;
  generates_with: string[];
  uses_tools: string[];
  try_online_url: string;
  package_url: string;
}

/** i18n 副表行（mock 内存态；结构镜像 skills_i18n 表——0004 扩展七字段+tags）。 */
interface RawSkillI18nRow {
  skill_id: number;
  locale: string;
  title: string | null;
  summary: string | null;
  description: string | null;
  task_expression: string | null;
  deliverables: string[] | null;
  good_fit: string[] | null;
  not_for: string[] | null;
  tags: Record<string, unknown> | null;
}
import { can, resolvePermissions } from './auth';

/*
 * skills-web 技能 mock handler（本应用接口的 mock 契约）。
 *
 * 契约 = skills Edge Fn（apps/skills-web/supabase/functions/skills/index.ts）：
 * - envelope { code, data, msg }，code 0 成功
 * - GET    /skills      → 全量列表（匿名可调，公开读）
 * - GET    /skills/:id  → 单条（匿名可调；不存在 1013/404）
 * - POST   /skills      → 新建（skills:skill:create；无 JWT 1010/401、无码 1011/403）
 * - PUT    /skills/:id  → 更新（skills:skill:update；含 updated_at 服务端管理语义）
 * - DELETE /skills/:id  → 删除（skills:skill:delete；不存在 1013/404）
 * - 校验：title 必填、rating 1–5 整数、tone 枚举 → 1014
 *
 * 身份模拟（iam-web src/mocks/auth.ts 同款）：handler 读 Authorization 头——
 * - 无 Authorization：匿名 → 读 200 / 写 403
 * - Bearer mock-skills-editor：写码持有者 → 写放行
 * - Bearer mock-admin：admin('*') → 全放行
 * 独立态切换身份：devtools 里 localStorage.iam_token = 'mock-admin' 后刷新。
 *
 * 种子：与 skills-web supabase/migrations/0002_seed_skills.sql 同源（14 条，
 * 字段值逐条对齐）——mock 内存态与 DB 种子呈现一致；内存态无持久化，刷新回种子。
 *
 * 路径派生：iam menu-handlers 同模式（pagePaths），常量来自 api/endpoints.ts，
 * 路径漂移在结构上不可能。
 */

/** 集成态页面 fetch 带 /skills 前缀（SW 拦截在宿主 proxy rewrite 之前），两种路径形态都登记。 */
const pagePaths = (p: string) => [p, `${INTEGRATION_PREFIX}${p}`];

/**
 * 详情页字段的缺省值（0003 迁移的 DB 默认值镜像）——旧 14 条种子经此补齐，
 * 与「旧数据折 tags」的迁移语义一致：scenes → scenarios、roles → tasks。
 */
function withDetailDefaults(
  row: Omit<
    RawSkillRow,
    | 'version'
    | 'task_expression'
    | 'summary'
    | 'description'
    | 'price_kind'
    | 'price_amount'
    | 'price_note'
    | 'requires_api_key'
    | 'likes'
    | 'score'
    | 'reviews_count'
    | 'media'
    | 'demo_examples'
    | 'deliverables'
    | 'good_fit'
    | 'not_for'
    | 'requirements'
    | 'tags'
    | 'generates_with'
    | 'uses_tools'
    | 'try_online_url'
    | 'package_url'
  >,
): RawSkillRow {
  return {
    ...row,
    version: '1.0.0',
    task_expression: '',
    summary: '',
    description: '',
    price_kind: row.free ? 'free' : 'paid',
    price_amount: row.free ? null : 0,
    price_note: '',
    requires_api_key: [],
    likes: 0,
    score: null,
    reviews_count: 0,
    media: [],
    demo_examples: [],
    deliverables: [],
    good_fit: [],
    not_for: [],
    requirements: {},
    // 旧数据折 tags（迁移同款）：scenes → scenarios，roles → tasks
    tags: {
      scenarios: row.scenes,
      tasks: row.roles,
      highlights: [],
      styles: [],
    },
    generates_with: [],
    uses_tools: [],
    try_online_url: '',
    package_url: '',
  };
}

/**
 * 与 0002 种子同源（字段逐条对齐；id 模拟 identity 从 1 起），
 * 经 withDetailDefaults 补详情页缺省字段——0004 迁移的富条目另行覆盖 id=1。
 */
const seedSkills: RawSkillRow[] = [
  {
    id: 1,
    title: '薄荷暗夜软件产品官网',
    free: true,
    featured: false,
    output_types: ['网页'],
    roles: ['创始人', '设计师'],
    scenes: ['品牌识别'],
    downloads: 340,
    bookmarks: 6,
    rating: 5,
    tone: 'primary',
    agents: ['CC', 'CX', 'GH', 'GC', 'AG', 'CU'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-10T00:00:00Z',
  },
  {
    id: 2,
    title: '橙焙电单车商店',
    free: true,
    featured: false,
    output_types: ['网页', '图像'],
    roles: ['电商卖家'],
    scenes: ['社交媒体', '内容发布'],
    downloads: 241,
    bookmarks: 8,
    rating: 5,
    tone: 'warning',
    agents: ['CC', 'CX', 'OC', 'OB', 'AG', 'CU'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-08T00:00:00Z',
  },
  {
    id: 3,
    title: '清新绿药房商店',
    free: true,
    featured: false,
    output_types: ['网页'],
    roles: ['电商卖家'],
    scenes: ['社交媒体'],
    downloads: 209,
    bookmarks: 7,
    rating: 4,
    tone: 'success',
    agents: ['CC', 'CX', 'HA', 'AG', 'CU'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-05T00:00:00Z',
  },
  {
    id: 4,
    title: '贴纸闪赠礼应用网站',
    free: true,
    featured: false,
    output_types: ['网页', '图像'],
    roles: ['设计师', '内容创作者'],
    scenes: ['品牌识别', '社交媒体'],
    downloads: 207,
    bookmarks: 5,
    rating: 5,
    tone: 'secondary',
    agents: ['CC', 'CX', 'KI', 'AG', 'CU'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  },
  {
    id: 5,
    title: '马克笔涂鸦品牌工作室',
    free: true,
    featured: false,
    output_types: ['网页', '图像'],
    roles: ['设计师', '创始人'],
    scenes: ['品牌识别'],
    downloads: 186,
    bookmarks: 7,
    rating: 4,
    tone: 'accent',
    agents: ['CC', 'CX', 'AG', 'CU'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-10-28T00:00:00Z',
  },
  {
    id: 6,
    title: '轨道协作落地站',
    free: true,
    featured: false,
    output_types: ['网页'],
    roles: ['创始人', '营销人员'],
    scenes: ['内容发布'],
    downloads: 203,
    bookmarks: 2,
    rating: 4,
    tone: 'info',
    agents: ['CC', 'CX', 'AG', 'CU'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-10-25T00:00:00Z',
  },
  {
    id: 7,
    title: '黑白设计师作品集',
    free: true,
    featured: false,
    output_types: ['网页'],
    roles: ['设计师'],
    scenes: ['品牌识别'],
    downloads: 184,
    bookmarks: 4,
    rating: 5,
    tone: 'primary',
    agents: ['CC', 'CX', 'AG', 'CU'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-10-21T00:00:00Z',
  },
  {
    id: 8,
    title: '青柠边框设计师作品集',
    free: true,
    featured: false,
    output_types: ['网页'],
    roles: ['设计师', '研究人员'],
    scenes: ['品牌识别'],
    downloads: 178,
    bookmarks: 6,
    rating: 4,
    tone: 'secondary',
    agents: ['CC', 'CX', 'AG', 'CU'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-10-18T00:00:00Z',
  },
  {
    id: 9,
    title: '方格纸饮品品牌网站',
    free: true,
    featured: false,
    output_types: ['网页'],
    roles: ['创始人', '营销人员'],
    scenes: ['社交媒体'],
    downloads: 177,
    bookmarks: 4,
    rating: 4,
    tone: 'warning',
    agents: ['CC', 'CX', 'AG', 'CU'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-10-15T00:00:00Z',
  },
  {
    id: 10,
    title: '宝蓝宠物用品商店',
    free: true,
    featured: false,
    output_types: ['网页', '图像'],
    roles: ['电商卖家'],
    scenes: ['社交媒体', '内容发布'],
    downloads: 176,
    bookmarks: 4,
    rating: 5,
    tone: 'primary',
    agents: ['CC', 'CX', 'AG', 'CU'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-10-12T00:00:00Z',
  },
  {
    id: 11,
    title: '融资路演幻灯片生成',
    free: false,
    featured: true,
    output_types: ['幻灯片'],
    roles: ['创始人', '顾问'],
    scenes: ['教学讲解', '内容发布'],
    downloads: 452,
    bookmarks: 31,
    rating: 5,
    tone: 'info',
    agents: ['CC', 'CX', 'GH', 'OC'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-11T00:00:00Z',
  },
  {
    id: 12,
    title: '短视频产品口播脚本',
    free: false,
    featured: true,
    output_types: ['视频'],
    roles: ['营销人员', '内容创作者'],
    scenes: ['社交媒体', '内容发布'],
    downloads: 388,
    bookmarks: 22,
    rating: 4,
    tone: 'secondary',
    agents: ['CC', 'AG', 'GC', 'KI'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-09T00:00:00Z',
  },
  {
    id: 13,
    title: '品牌插画批量生成',
    free: true,
    featured: false,
    output_types: ['图像'],
    roles: ['设计师', '内容创作者'],
    scenes: ['品牌识别'],
    downloads: 301,
    bookmarks: 15,
    rating: 4,
    tone: 'accent',
    agents: ['CC', 'CX', 'CU'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-03T00:00:00Z',
  },
  {
    id: 14,
    title: '课堂教学课件助手',
    free: true,
    featured: false,
    output_types: ['幻灯片'],
    roles: ['教师', '研究人员'],
    scenes: ['教学讲解'],
    downloads: 156,
    bookmarks: 9,
    rating: 5,
    tone: 'success',
    agents: ['CC'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-10-30T00:00:00Z',
  },
].map(withDetailDefaults);

/**
 * 参考站维度的完整条目（id=1「薄荷暗夜软件产品官网」等价物）——覆盖
 * version/用途句/描述/价格三态/统计/媒体/演示示例/清单/标签四桶/准备事项/
 * 兼容能力列（0004 迁移的富种子与本条同源）。
 */
const richSeed: RawSkillRow = {
  ...withDetailDefaults({
    id: 1,
    title: '薄荷暗夜软件产品官网',
    free: true,
    featured: false,
    output_types: ['网页'],
    roles: ['创始人', '设计师'],
    scenes: ['品牌识别'],
    downloads: 340,
    bookmarks: 6,
    rating: 5,
    tone: 'primary',
    agents: ['CC', 'CX', 'AG', 'CU'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-10T00:00:00Z',
  }),
  version: '1.0.1',
  task_expression: '使用这个 Skill：制作落地页。',
  summary:
    '为 AI 或软件工具打造一套深色产品营销网站：近黑石墨底色、唯一的薄荷绿强调色，粗体标题中嵌入斜体衬线关键词。',
  description:
    '包含产品、定价、资源、活动和更新日志五个相互连通的页面，切换、筛选、搜索、倒计时和表单都能实际操作。',
  price_kind: 'free',
  price_amount: null,
  likes: 20,
  score: 5.0,
  reviews_count: 1,
  media: [
    {
      kind: 'video',
      url: '/skills/bs-mint-noir-saas-site/media/preview-0.webp',
      alt: '薄荷暗夜软件产品官网 预览视频',
      order: 0,
    },
    {
      kind: 'image',
      url: '/skills/bs-mint-noir-saas-site/media/preview-1.webp',
      alt: '薄荷暗夜软件产品官网 预览图 1',
      order: 1,
    },
  ],
  demo_examples: [
    {
      prompt:
        '/bs-mint-noir-saas-site 为小型网店账务助手 Ledgerly 搭一套营销站。',
      mediaUrl: '/skills/bs-mint-noir-saas-site/media/preview-1.webp',
      mediaKind: 'image',
    },
  ],
  deliverables: [
    '一套完整的可交互示例网站，包含产品、定价、资源、活动和更新日志五个页面。',
    '可复用的模板与风格指南，锁定石墨底色、薄荷强调色与代码绘制的产品窗口。',
    '页面库、图标规范、框架适配指南与本地校验脚本。',
  ],
  good_fit: [
    '正在发布应用、希望网站沉稳高级的软件团队。',
    '需要定价、帮助、活动与发布说明一致对外的创始人。',
  ],
  not_for: ['需要多语言站点的团队。', '只想放一张静态海报的场合。'],
  requirements: {
    bring: [
      '产品名、一句话品类与主标题关键词。',
      '真实集成、核心功能与一个带数据的客户故事。',
    ],
    dependencies: ['用于预览的现代浏览器。', '生成网站所需的框架工具链。'],
    outside_costs: ['生成人像照片可能产生额外费用。'],
    lastTested: 'v1.0.1 — Claude Code / Cursor / Codex',
  },
  tags: {
    scenarios: ['web-design', 'product-launch'],
    tasks: ['build-landing-page', 'build-product-site'],
    highlights: ['style-locked', 'editable-output', 'conversion-focused'],
    styles: ['Bento Grid', 'Soft Glow', 'Dark Mode', 'Mint Accent'],
  },
  generates_with: ['Claude Fable 5.2 (Anthropic)'],
  uses_tools: [],
  try_online_url: '',
};

/**
 * 种子装配：0002 的 14 条基线，id=1 用富条目覆盖（与 0004 迁移同款语义）——
 * **保持原位置**（列表顺序即 id 序，替换不挪位）。
 */
function assembleSeed(): RawSkillRow[] {
  return seedSkills.map((s) => (s.id === richSeed.id ? richSeed : s));
}

// 种子：0002 的 14 条基线 + 富条目覆盖 id=1（与 0004 迁移同款语义）
let skills: RawSkillRow[] = structuredClone(assembleSeed());

/** i18n 副表种子（en-US 译文；zh-CN 基线在主表——副表只存译文）。 */
let skillI18n: RawSkillI18nRow[] = [
  {
    skill_id: 1,
    locale: 'en-US',
    title: 'Mint Noir SaaS Site',
    summary:
      'Build a dark marketing site for a software or AI product, with near-black graphite surfaces, a single mint accent and italic serif highlight words inside bold headlines.',
    description:
      'You get five connected pages — Product, Pricing, Resources, Events and Changelog — each with working toggles, filters, search, countdowns and forms.',
    task_expression: 'Use this Skill to build landing page.',
    deliverables: [
      'A complete interactive example site with five connected pages.',
      'A reusable template and style guide.',
      'A page library, icon rules and a local validator.',
    ],
    good_fit: [
      'Software and AI teams launching or relaunching a product site.',
      'Founders who want pricing, help and release notes in one place.',
    ],
    not_for: [
      'Teams that need a multilingual site.',
      'Single static poster use cases.',
    ],
    tags: {
      scenarios: ['web-design', 'product-launch'],
      tasks: ['build-landing-page'],
      highlights: ['style-locked', 'editable-output'],
      styles: ['Bento Grid', 'Soft Glow', 'Dark Mode', 'Mint Accent'],
    },
  },
];

let nextId = 1000;

/**
 * 测试用：读取 mock 内存态的**原始行**（snake 列名，未经 api 层归一）。
 * 用于断言「camel 入参落库为 snake 列名」这条写路径契约（api 层 mapRow 会
 * 把未知 camel 键原样透传，从归一后的对象看不出列名错误）。
 */
export function __getRawSkillRows(): RawSkillRow[] {
  return skills;
}

/** 测试复位：恢复种子（api 层测试 afterEach 调用；iam menu-handlers 同款）。 */
export function resetSkillMock(): void {
  skills = structuredClone(assembleSeed());
  skillI18n = [
    {
      skill_id: 1,
      locale: 'en-US',
      title: 'Mint Noir SaaS Site',
      summary:
        'Build a dark marketing site for a software or AI product, with near-black graphite surfaces, a single mint accent and italic serif highlight words inside bold headlines.',
      description:
        'You get five connected pages — Product, Pricing, Resources, Events and Changelog — each with working toggles, filters, search, countdowns and forms.',
      task_expression: 'Use this Skill to build landing page.',
      deliverables: [
        'A complete interactive example site with five connected pages.',
        'A reusable template and style guide.',
        'A page library, icon rules and a local validator.',
      ],
      good_fit: [
        'Software and AI teams launching or relaunching a product site.',
        'Founders who want pricing, help and release notes in one place.',
      ],
      not_for: [
        'Teams that need a multilingual site.',
        'Single static poster use cases.',
      ],
      tags: {
        scenarios: ['web-design', 'product-launch'],
        tasks: ['build-landing-page'],
        highlights: ['style-locked', 'editable-output'],
        styles: ['Bento Grid', 'Soft Glow', 'Dark Mode', 'Mint Accent'],
      },
    },
  ];
  nextId = 1000;
}

const ok = (data: unknown) => HttpResponse.json({ code: 0, data, msg: 'ok' });
const fail = (code: number, msg: string, status = 400) =>
  HttpResponse.json({ code, data: null, msg }, { status });

const TONES = ['primary', 'secondary', 'accent', 'info', 'success', 'warning'];

/**
 * 写请求体解析校验（镜像 Edge Fn parseSkillInput；违例返回中文 msg，与
 * Edge Fn 1014 语义一致——mock 里 msg 直接可读，无需 key 间接层）。
 * 返回 null = 通过；否则 = 错误 msg。
 */
function validateBody(
  body: Record<string, unknown>,
  partial: boolean,
): string | null {
  const title =
    body.title !== undefined ? String(body.title).trim() : undefined;
  if (!partial && !title) return '技能名称不能为空';
  if (partial && title === '') return '技能名称不能为空';
  if (
    body.rating !== undefined &&
    (!Number.isInteger(Number(body.rating)) ||
      Number(body.rating) < 1 ||
      Number(body.rating) > 5)
  ) {
    return '评分必须是 1–5 的整数';
  }
  if (body.tone !== undefined && !TONES.includes(String(body.tone))) {
    return '请求格式错误';
  }
  for (const key of ['outputTypes', 'roles', 'scenes', 'agents'] as const) {
    if (body[key] !== undefined && !Array.isArray(body[key])) {
      return '请求格式错误';
    }
  }
  if (
    body.priceKind !== undefined &&
    !['free', 'paid', 'requires_key'].includes(String(body.priceKind))
  ) {
    return '请求格式错误';
  }
  for (const key of [
    'requiresApiKey',
    'generatesWith',
    'usesTools',
    'deliverables',
    'goodFit',
    'notFor',
    'media',
    'demoExamples',
  ] as const) {
    if (body[key] !== undefined && !Array.isArray(body[key])) {
      return '请求格式错误';
    }
  }
  for (const key of ['requirements', 'tags'] as const) {
    const v = body[key];
    if (
      v !== undefined &&
      (typeof v !== 'object' || v === null || Array.isArray(v))
    ) {
      return '请求格式错误';
    }
  }
  return null;
}

/**
 * 从 body 提取可写字段（camelCase 契约，镜像 parseSkillInput 的字段映射）。
 * **camel→snake 映射与 Edge Fn toRowValues 一一对应**（两处必须同步改——
 * 漏一处 = 测试绿、线上 PGRST204）。
 */
function pickInput(body: Record<string, unknown>): Partial<RawSkillRow> {
  const out: Record<string, unknown> = {};
  if (body.title !== undefined) out.title = String(body.title).trim();
  if (body.free !== undefined) out.free = !!body.free;
  if (body.featured !== undefined) out.featured = !!body.featured;
  for (const key of ['outputTypes', 'roles', 'scenes', 'agents'] as const) {
    if (body[key] !== undefined) {
      // 入参 camel 契约 → 存储行 snake（镜像 parseSkillInput → DB 列映射）
      out[key === 'outputTypes' ? 'output_types' : key] = (
        body[key] as unknown[]
      ).map((v) => String(v));
    }
  }
  if (body.downloads !== undefined) out.downloads = Number(body.downloads) || 0;
  if (body.bookmarks !== undefined) out.bookmarks = Number(body.bookmarks) || 0;
  if (body.rating !== undefined) out.rating = Number(body.rating);
  if (body.tone !== undefined) out.tone = String(body.tone);
  // —— 详情页字段（11-24；映射与 fn toRowValues 同表）——
  for (const key of ['version', 'summary', 'description'] as const) {
    if (body[key] !== undefined) out[key] = String(body[key]);
  }
  // camel→snake 单列映射（与 Edge Fn toRowValues 同表——两处必须同步）
  for (const [camel, snake] of [
    ['taskExpression', 'task_expression'],
    ['priceNote', 'price_note'],
    ['tryOnlineUrl', 'try_online_url'],
    ['packageUrl', 'package_url'],
  ] as const) {
    if (body[camel] !== undefined) out[snake] = String(body[camel]);
  }
  if (body.priceKind !== undefined) out.price_kind = String(body.priceKind);
  if (body.priceAmount !== undefined) {
    out.price_amount =
      body.priceAmount === null ? null : Number(body.priceAmount);
  }
  if (body.score !== undefined) {
    out.score = body.score === null ? null : Number(body.score);
  }
  for (const [camel, snake] of [
    ['requiresApiKey', 'requires_api_key'],
    ['generatesWith', 'generates_with'],
    ['usesTools', 'uses_tools'],
    ['deliverables', 'deliverables'],
    ['goodFit', 'good_fit'],
    ['notFor', 'not_for'],
    ['media', 'media'],
    ['demoExamples', 'demo_examples'],
  ] as const) {
    if (body[camel] !== undefined) out[snake] = body[camel];
  }
  for (const key of ['requirements', 'tags'] as const) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  if (body.likes !== undefined) out.likes = Number(body.likes) || 0;
  if (body.reviewsCount !== undefined)
    out.reviews_count = Number(body.reviewsCount) || 0;
  return out as Partial<RawSkillRow>;
}

/** body.i18n → 副表 upsert（镜像 Edge Fn parseI18nPayload；0004 七字段+tags）。 */
function pickI18n(body: Record<string, unknown>): RawSkillI18nRow[] | null {
  const raw = body.i18n;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out: RawSkillI18nRow[] = [];
  for (const [locale, value] of Object.entries(
    raw as Record<string, unknown>,
  )) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const src = value as Record<string, unknown>;
    const str = (v: unknown): string | null =>
      v === undefined || v === null ? null : String(v);
    const arr = (v: unknown): string[] | null => {
      if (v === undefined || v === null) return null;
      return Array.isArray(v) ? v.map((x) => String(x)) : null;
    };
    const tags =
      src.tags === undefined
        ? null
        : src.tags === null
          ? null
          : typeof src.tags === 'object' && !Array.isArray(src.tags)
            ? (src.tags as Record<string, unknown>)
            : null;
    out.push({
      skill_id: 0, // 调用方填
      locale,
      title: str(src.title),
      summary: str(src.summary),
      description: str(src.description),
      task_expression: str(src.taskExpression),
      deliverables: arr(src.deliverables),
      good_fit: arr(src.goodFit),
      not_for: arr(src.notFor),
      tags,
    });
  }
  return out.length ? out : null;
}

/** 详情回落：副表译文覆盖基线（字段 null/空 → 保留基线；0004 七字段+tags）。 */
function applyI18n(
  row: RawSkillRow,
  i18nRow: RawSkillI18nRow | undefined,
): RawSkillRow {
  if (!i18nRow) return row;
  const out = { ...row };
  if (i18nRow.title) out.title = i18nRow.title;
  if (i18nRow.summary) out.summary = i18nRow.summary;
  if (i18nRow.description) out.description = i18nRow.description;
  if (i18nRow.task_expression) out.task_expression = i18nRow.task_expression;
  // 数组字段：非 null 且非空数组才覆盖（空数组 = 未译，回落基线）
  if (i18nRow.deliverables?.length) out.deliverables = i18nRow.deliverables;
  if (i18nRow.good_fit?.length) out.good_fit = i18nRow.good_fit;
  if (i18nRow.not_for?.length) out.not_for = i18nRow.not_for;
  if (i18nRow.tags && Object.keys(i18nRow.tags).length > 0) {
    out.tags = i18nRow.tags;
  }
  return out;
}

export const skillHandlers = [
  // GET 列表（匿名可调）
  ...pagePaths(SKILLS_COLLECTION_PATH).map((path) =>
    http.get(path, async () => {
      await delay(200);
      return ok(skills);
    }),
  ),

  // POST 新建（require skills:skill:create）
  ...pagePaths(SKILLS_COLLECTION_PATH).map((path) =>
    http.post(path, async ({ request }) => {
      await delay(200);
      if (!can(resolvePermissions(request), 'skills:skill:create')) {
        const auth = request.headers.get('authorization');
        return auth
          ? fail(1011, '没有执行此操作的权限', 403)
          : fail(1010, '请先登录', 401);
      }
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      if (!body) return fail(1001, '请求格式错误');
      const err = validateBody(body, false);
      if (err) return fail(1014, err);
      const base = withDetailDefaults({
        id: ++nextId,
        title: '',
        free: false,
        featured: false,
        output_types: [],
        roles: [],
        scenes: [],
        downloads: 0,
        bookmarks: 0,
        rating: 3,
        tone: 'primary',
        agents: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      const node: RawSkillRow = {
        ...base,
        ...(pickInput(body) as Partial<RawSkillRow>),
        id: base.id,
        created_at: base.created_at,
        updated_at: base.updated_at,
      };
      skills = [node, ...skills];
      // 译文副表（可选载荷）
      const i18nRows = pickI18n(body);
      if (i18nRows) {
        for (const row of i18nRows) {
          skillI18n = [
            ...skillI18n.filter(
              (r) => !(r.skill_id === node.id && r.locale === row.locale),
            ),
            { ...row, skill_id: node.id },
          ];
        }
      }
      return ok(node);
    }),
  ),

  // GET 详情（匿名可调；?locale= 命中副表译文，缺失回落基线）
  ...pagePaths(SKILLS_ITEM_PATH(':id')).map((path) =>
    http.get(path, async ({ params, request }) => {
      await delay(200);
      const id = Number(params['id']);
      const row = skills.find((n) => n.id === id);
      if (!row) return fail(1013, '技能不存在', 404);
      const locale = new URL(request.url).searchParams.get('locale');
      if (!locale) return ok(row);
      const i18nRow = skillI18n.find(
        (r) => r.skill_id === id && r.locale === locale,
      );
      return ok(applyI18n(row, i18nRow));
    }),
  ),

  // PUT 更新（require skills:skill:update；部分更新——body 缺省沿用行值）
  ...pagePaths(SKILLS_ITEM_PATH(':id')).map((path) =>
    http.put(path, async ({ request, params }) => {
      await delay(200);
      if (!can(resolvePermissions(request), 'skills:skill:update')) {
        const auth = request.headers.get('authorization');
        return auth
          ? fail(1011, '没有执行此操作的权限', 403)
          : fail(1010, '请先登录', 401);
      }
      const id = Number(params['id']);
      const row = skills.find((n) => n.id === id);
      if (!row) return fail(1013, '技能不存在', 404);
      const body = (await request.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      const err = validateBody(body, true);
      if (err) return fail(1014, err);
      Object.assign(row, pickInput(body), {
        updated_at: new Date().toISOString(),
      });
      // 译文副表（可选载荷）
      const i18nRows = pickI18n(body);
      if (i18nRows) {
        for (const i18nRow of i18nRows) {
          skillI18n = [
            ...skillI18n.filter(
              (r) => !(r.skill_id === id && r.locale === i18nRow.locale),
            ),
            { ...i18nRow, skill_id: id },
          ];
        }
      }
      return ok(row);
    }),
  ),

  // DELETE 删除（require skills:skill:delete）
  ...pagePaths(SKILLS_ITEM_PATH(':id')).map((path) =>
    http.delete(path, async ({ request, params }) => {
      await delay(200);
      if (!can(resolvePermissions(request), 'skills:skill:delete')) {
        const auth = request.headers.get('authorization');
        return auth
          ? fail(1011, '没有执行此操作的权限', 403)
          : fail(1010, '请先登录', 401);
      }
      const id = Number(params['id']);
      const row = skills.find((n) => n.id === id);
      if (!row) return fail(1013, '技能不存在', 404);
      skills = skills.filter((n) => n.id !== id);
      return ok({ id });
    }),
  ),
];

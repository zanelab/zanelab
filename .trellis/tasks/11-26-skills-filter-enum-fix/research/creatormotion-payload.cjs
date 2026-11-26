/*
 * 采集自 skillry.dev/zh/skills/bs-creatormotion-type-title-takeover(2026-11-26)
 * → SkillInput 载荷组装草稿(任务:通过新建技能接口创建)。
 *
 * 映射决策:
 * - 场景:参考站「内容与编辑发布」= 本库 11-26 新值域的「内容发布」。
 * - 角色:参考站「自媒体创作者」≈ 本库值域「内容创作者」。
 * - agents:参考站列了 10 个(含 Claude Desktop/Cowork/ChatGPT/Kilo Code,
 *   不在本库值域);取与本库 10 码值域的交集:CC、CX、CU、GH、OC、OB、HA。
 * - tags.styles 存原文标签;scenarios/tasks/highlights 桶本页无对应信息,不填。
 * - requirements:bring(需自带)/dependencies(依赖)/lastTested 结构化拆分。
 * - price 免费;rating 4.0、reviews 2、likes 49、bookmarks 44、downloads 1347。
 * - media:预览图/视频 URL 为参考站相对路径(站内资源),标注来源;本地无
 *   对应文件,不做 skills-upload 转存(若要转存需先下载再上传)。
 * - packageUrl:参考站 ZIP 不可直接采集,留空。
 */

/** SkillInput 载荷(与 api/skills.ts 契约对齐) */
const SKILL_INPUT = {
  title: '自媒体视频动效 · 人物后大字接全屏宣言',
  free: true,
  featured: false,
  outputTypes: ['视频'],
  roles: ['内容创作者'],
  scenes: ['内容发布'],
  downloads: 1347,
  bookmarks: 44,
  rating: 4,
  tone: 'warning', // 热门徽章语义
  agents: ['CC', 'CX', 'CU', 'GH', 'OC', 'OB', 'HA'],

  version: '1.0.3',
  taskExpression: '适合做动画 B-roll',
  summary:
    '大字在人物后方出现，人物与背景切走后，文字保持原位接管画面。保留人物遮挡与明确的镜头落点。',
  description: [
    '人物后大字接全屏宣言:大字在人物后方出现,人物与背景切走后,文字保持原位接管画面。',
    '## 规格与风格',
    '- 画幅:16:9、9:16、4:3、3:4 四种比例,各有原生排版',
    '- 分辨率:默认输出 4K,也可选 2K 或 1080p,画面底部留给字幕',
    '- 配色:默认白黄风格,可切换黑绿、黑白,三套都带浅灰网格底',
    '- 字体:默认得意黑,可 --zh-font noto-sans-sc 切换 Noto Sans SC',
    '- 抠像:支持 --matte 传入已有遮罩/透明视频,或自动调用 HyperFrames remove-background',
    '- 人物/封面/会话头像非 HTML 占位,提供图片即替换指定位置',
    '## 调用',
    '/bs-creatormotion-type-title-takeover 用默认白黄风格,把我的这段讲解做成清楚的动效',
  ].join('\n\n'),

  priceKind: 'free',
  priceAmount: null,
  priceNote: null,
  requiresApiKey: [],

  likes: 49,
  score: 4.0,
  reviewsCount: 2,

  media: [
    // 参考站站内资源,相对路径;如需转存走 skills-upload
    { kind: 'image', url: '/skills/bs-creatormotion-type-title-takeover/media/preview-1.webp', alt: '预览图 1', order: 1 },
    { kind: 'video', url: '/skills/bs-creatormotion-type-title-takeover/media/preview-1.mp4', alt: '演示视频 1', order: 2 },
    { kind: 'video', url: '/skills/bs-creatormotion-type-title-takeover/media/preview-2.mp4', alt: '演示视频 2', order: 3 },
    { kind: 'video', url: '/skills/bs-creatormotion-type-title-takeover/media/preview-3.mp4', alt: '演示视频 3', order: 4 },
    { kind: 'video', url: '/skills/bs-creatormotion-type-title-takeover/media/preview-4.mp4', alt: '演示视频 4', order: 5 },
  ],

  demoExamples: [
    {
      prompt: '用默认白黄风格,把我的这段讲解做成清楚的动效',
      caption: '默认白黄风格示例',
    },
  ],

  deliverables: [
    '可替换内容的「人物后大字接全屏宣言」动效与运动说明。',
    '三套统一配色、四种画面比例和默认 4K 输出。',
    '本地生成脚本、可编辑视频工程和校对步骤。',
  ],
  goodFit: [
    '需要用图形解释观点的口播视频。',
    '文字简洁、结构清晰的教程片段。',
    '需要保持统一视觉的系列内容。',
  ],
  notFor: [
    '自动剪辑一整条长视频。',
    '复制参考博主的身份或原始画面。',
    '自动生成未提供的人物表演或配乐。',
  ],

  requirements: {
    bring: ['4K 原始素材(默认输出为 4K)'],
    dependencies: [
      'Claude Code — Opus 5.5 或 Fable 5.2(推荐)',
      'HyperFrames CLI 0.8.30 或兼容版本(必需)',
      'Node.js 22 或更高版本(必需)',
      'FFmpeg(必需)',
      'HyperFrames 背景移除模型,首次使用时下载(未提供主讲人抠像时使用)',
    ],
    outsideCosts: [],
    lastTested: '2026-11-09',
  },

  tags: {
    styles: ['Create Broll Animation', '风格锁定', '系列一致', '成果可编辑', 'Minimalist', 'Editorial', 'Typographic'],
  },

  generatesWith: ['Claude Fable 5.2 (Anthropic)', 'Claude Opus 5.5 (Anthropic)'],
  usesTools: ['HyperFrames'],
  tryOnlineUrl: '',

  // en 译文:参考站该页有英文版,但本次只采了中文页,不造译 —— 不带 i18n 载荷
  // packageUrl: '' // 参考站 ZIP 不可直接采集,留空(字段缺省 = 不写)
};

module.exports = { SKILL_INPUT };

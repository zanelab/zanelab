import type { SkillInput, SkillTags } from '../../../api/skills';
import type { OutputType } from '../data';

/**
 * 表单状态（skills.form.* 单一形状；新建缺省 / 编辑回填同构）。
 *
 * 分节归属（任务 11-24-skills-detail-schema design §3）：
 * - 基础区：基线语言内容（标题/用途句/摘要/描述）+ 版本号
 * - 类型专属区：web / slides / video / image——按 outputTypes 选中的类型渲染
 *   对应分节（多选 = 并集）；切换类型**不清值**（state 保留，提交时按激活
 *   分节裁剪 payload）
 * - 内容区：交付清单 / 适用 / 不适用 / 准备事项（四段）
 * - 标签区：scenarios/tasks/highlights（i18n key，语言包候选）+ styles（原文不译）
 * - 兼容区：适配 agent / 驱动模型 / 外部工具
 * - 媒体区：画廊（图片/视频 URL + 排序）+ 演示示例（prompt + 媒体）
 * - 定价区：free / paid(amount) / requires_key(note + api keys)
 * - i18n 区：基线语言之外的译文（locale → 四字段；留空 = 回落基线）
 */
export interface SkillFormState {
  // 基础
  title: string;
  taskExpression: string;
  summary: string;
  description: string;
  version: string;
  // 兼容旧列
  free: boolean;
  featured: boolean;
  outputTypes: OutputType[];
  roles: string[];
  scenes: string[];
  tone: SkillInput['tone'];
  rating: number;
  agents: string[];
  // 类型专属
  web: {
    tryOnlineUrl: string;
    techStack: string;
  };
  slides: {
    exportFormat: string;
    slideCount: string;
    speakerNotes: boolean;
  };
  video: {
    duration: string;
    resolution: string;
    voiceLanguages: string;
    apiKeys: string;
  };
  image: {
    sampleImages: string;
    dimensions: string;
  };
  // 内容清单
  deliverables: string;
  goodFit: string;
  notFor: string;
  requirements: {
    bring: string;
    dependencies: string;
    outsideCosts: string;
    lastTested: string;
  };
  // 标签
  tags: SkillTags;
  // 兼容能力
  generatesWith: string;
  usesTools: string;
  // 媒体
  media: string;
  demoExamples: string;
  // 定价
  priceKind: 'free' | 'paid' | 'requires_key';
  priceAmount: string;
  priceNote: string;
  requiresApiKey: string;
  // i18n 译文（locale → 字段）
  i18nLocale: string;
  i18nTitle: string;
  i18nSummary: string;
  i18nDescription: string;
  i18nTaskExpression: string;
}

/** 新建缺省（编辑回填 = formFromSkill 覆盖）。 */
export const INITIAL_SKILL_FORM: SkillFormState = {
  title: '',
  taskExpression: '',
  summary: '',
  description: '',
  version: '1.0.0',
  free: true,
  featured: false,
  outputTypes: [],
  roles: [],
  scenes: [],
  tone: 'primary',
  rating: 3,
  agents: [],
  web: { tryOnlineUrl: '', techStack: '' },
  slides: { exportFormat: 'pptx', slideCount: '', speakerNotes: true },
  video: { duration: '', resolution: '1080p', voiceLanguages: '', apiKeys: '' },
  image: { sampleImages: '', dimensions: '' },
  deliverables: '',
  goodFit: '',
  notFor: '',
  requirements: {
    bring: '',
    dependencies: '',
    outsideCosts: '',
    lastTested: '',
  },
  tags: { scenarios: [], tasks: [], highlights: [], styles: [] },
  generatesWith: '',
  usesTools: '',
  media: '',
  demoExamples: '',
  priceKind: 'free',
  priceAmount: '',
  priceNote: '',
  requiresApiKey: '',
  i18nLocale: 'en-US',
  i18nTitle: '',
  i18nSummary: '',
  i18nDescription: '',
  i18nTaskExpression: '',
};

/** 输出类型 → 专属分节（多选 = 并集；design §3.1）。 */
export const SECTIONS_BY_OUTPUT: Record<OutputType, OutputType[]> = {
  网页: ['网页'],
  幻灯片: ['幻灯片'],
  视频: ['视频'],
  图像: ['图像'],
};

/** 当前选中的输出类型激活的专属分节集合。 */
export function activeSections(outputTypes: OutputType[]): OutputType[] {
  const set = new Set<OutputType>();
  for (const type of outputTypes) {
    for (const section of SECTIONS_BY_OUTPUT[type] ?? []) set.add(section);
  }
  return [...set];
}

/** 逗号/换行分隔文本 → 字符串数组（去空、去重）。 */
export function splitList(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/[,，\n]/)
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  ];
}

/**
 * 表单状态 → API 载荷（SkillInput）。
 *
 * **按激活分节裁剪**（design §3.1）：未激活类型的专属字段不落库
 * （切类型后残留的旧值不会污染新条目）。
 * i18n：译文区有内容才产出 i18n 载荷（全空 = 不提交该 locale = 回落基线）。
 */
export function toSkillInput(form: SkillFormState): SkillInput {
  const active = new Set(activeSections(form.outputTypes));
  const input: SkillInput = {
    title: form.title.trim(),
    taskExpression: form.taskExpression.trim(),
    summary: form.summary.trim(),
    description: form.description.trim(),
    version: form.version.trim() || '1.0.0',
    free: form.priceKind === 'free',
    featured: form.featured,
    outputTypes: form.outputTypes,
    roles: form.roles,
    scenes: form.scenes,
    tone: form.tone,
    rating: form.rating,
    agents: form.agents,
    priceKind: form.priceKind,
    priceAmount:
      form.priceKind === 'paid' && form.priceAmount
        ? Number(form.priceAmount)
        : null,
    priceNote: form.priceKind === 'requires_key' ? form.priceNote.trim() : '',
    requiresApiKey:
      form.priceKind === 'requires_key' ? splitList(form.requiresApiKey) : [],
    likes: 0,
    score: null,
    reviewsCount: 0,
    deliverables: splitList(form.deliverables),
    goodFit: splitList(form.goodFit),
    notFor: splitList(form.notFor),
    requirements: {
      bring: splitList(form.requirements.bring),
      dependencies: splitList(form.requirements.dependencies),
      outsideCosts: splitList(form.requirements.outsideCosts),
      lastTested: form.requirements.lastTested.trim(),
    },
    tags: {
      scenarios: form.tags.scenarios ?? [],
      tasks: form.tags.tasks ?? [],
      highlights: form.tags.highlights ?? [],
      styles: splitList((form.tags.styles ?? []).join(', ')),
    },
    generatesWith: splitList(form.generatesWith),
    usesTools: splitList(form.usesTools),
  };

  if (active.has('网页')) {
    input.tryOnlineUrl = form.web.tryOnlineUrl.trim();
  }
  if (active.has('图像')) {
    input.media = parseMediaInput(form.media);
  }
  if (active.has('视频')) {
    input.demoExamples = parseDemoInput(form.demoExamples);
  }

  // i18n 译文区：任一字段有值才提交该 locale
  if (
    form.i18nTitle.trim() ||
    form.i18nSummary.trim() ||
    form.i18nDescription.trim() ||
    form.i18nTaskExpression.trim()
  ) {
    input.i18n = {
      [form.i18nLocale]: {
        title: form.i18nTitle.trim() || null,
        summary: form.i18nSummary.trim() || null,
        description: form.i18nDescription.trim() || null,
        taskExpression: form.i18nTaskExpression.trim() || null,
      },
    };
  }

  return input;
}

/**
 * 媒体输入（每行一条：`kind|url` 或裸 URL → image）：
 * 形如 "video|https://…/demo.webp\nhttps://…/preview.png"。
 */
export function parseMediaInput(text: string): SkillInput['media'] {
  return splitList(text)
    .map((line) => {
      const [maybeKind, maybeUrl] = line.split('|');
      if (maybeUrl !== undefined) {
        return {
          kind:
            maybeKind.trim() === 'video'
              ? ('video' as const)
              : ('image' as const),
          url: maybeUrl.trim(),
        };
      }
      return { kind: 'image' as const, url: line.trim() };
    })
    .filter((m) => m.url);
}

/** 演示示例输入（每行一条：`prompt|mediaUrl`）。 */
export function parseDemoInput(text: string): SkillInput['demoExamples'] {
  return splitList(text)
    .map((line) => {
      const [prompt, mediaUrl] = line.split('|');
      return { prompt: prompt.trim(), mediaUrl: mediaUrl?.trim() };
    })
    .filter((d) => d.prompt);
}

import type { SkillInput, SkillRecord, SkillTags } from '../../../api/skills';
import type { OutputType } from '../data';

/**
 * 表单状态（任务 11-25-skills-form-upload：三区块重排 + 语言切换）。
 *
 * 状态模型（design §3.2）：
 * - base：语言无关字段（区块二 详细配置 + 区块三 展示与演示）
 * - i18n：区块一 基础信息的**按语言字段集**（zh-CN = 基线，en-US = 译文）——
 *   顶部语言切换只切 activeLocale，区块一绑定 i18n[activeLocale]；
 *   区块二/三不受影响。切换**不清值**（各语言各自持有草稿）。
 * - 提交（toSkillInput）：主表 ← base + i18n['zh-CN']（基线恒写）；
 *   i18n['en-US'] 仅当与基线**有差异**才携带（全同 = 不提交该 locale，
 *   避免无意义译文行）。
 * - 上传产物（packageUrl/media）：UploadedFile[]（url+name+size）。
 */

/** 语言无关的基础信息字段（单语言快照；zh 与 en 各一份）。 */
export interface I18nFields {
  title: string;
  summary: string;
  description: string;
  /** 每行一条（提交时 split 成数组） */
  deliverables: string;
  goodFit: string;
  notFor: string;
  /** 该语言标签（自由输入 + 模糊搜索） */
  tags: string[];
}

export interface SkillFormState {
  /** 区块一：按语言的基础信息（zh-CN 基线 / en-US 译文） */
  i18n: Record<'zh-CN' | 'en-US', I18nFields>;
  /** 顶部语言切换当前值（初始 = 站点当前语言） */
  activeLocale: 'zh-CN' | 'en-US';

  // 区块二 详细配置（语言无关）
  version: string;
  outputTypes: OutputType[];
  roles: string[];
  scenes: string[];
  agents: string[];
  priceKind: 'free' | 'paid';
  priceAmount: string;
  /** 技能包（单文件；新上传替换） */
  packageFile: UploadedFileInfo[];

  // 区块三 展示与演示（语言无关）
  tryOnlineUrl: string;
  /** 效果展示（多文件） */
  mediaFiles: UploadedFileInfo[];

  // 提交辅助态
  free: boolean; // 派生列（priceKind 推导，保持旧列一致）
  featured: boolean;
}

/** 上传组件的受控项（packages/ui UploadedFile 的本域别名）。 */
export interface UploadedFileInfo {
  name: string;
  size: number;
  url: string;
  kind: 'image' | 'video' | 'file';
}

export const INITIAL_I18N_FIELDS: I18nFields = {
  title: '',
  summary: '',
  description: '',
  deliverables: '',
  goodFit: '',
  notFor: '',
  tags: [],
};

export const INITIAL_SKILL_FORM: SkillFormState = {
  i18n: {
    'zh-CN': { ...INITIAL_I18N_FIELDS },
    'en-US': { ...INITIAL_I18N_FIELDS },
  },
  activeLocale: 'zh-CN',
  version: '1.0.0',
  outputTypes: [],
  roles: [],
  scenes: [],
  agents: [],
  priceKind: 'free',
  priceAmount: '',
  packageFile: [],
  tryOnlineUrl: '',
  mediaFiles: [],
  free: true,
  featured: false,
};

/** 逗号/中文逗号/换行分隔文本 → 字符串数组（去空、去重）。 */
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

/** 每行一条文本 → 数组（清单类字段；不按逗号切——条目本身可含逗号）。 */
export function splitLines(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/\n/)
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  ];
}

/** 数组 → 每行一条文本（回填）。 */
export function joinLines(list: string[] | undefined | null): string {
  return (list ?? []).join('\n');
}

/** 编辑回填：详情行（基线）+ 译文行（可缺）→ 表单状态。 */
export function formFromSkill(
  base: SkillRecord,
  translated: SkillRecord | null,
): SkillFormState {
  const zh: I18nFields = {
    title: base.title,
    summary: base.summary ?? '',
    description: base.description ?? '',
    deliverables: joinLines(base.deliverables),
    goodFit: joinLines(base.goodFit),
    notFor: joinLines(base.notFor),
    tags: tagDisplayList(base.tags),
  };
  // en 译文缺失的字段回落基线展示（保存时空串/与基线同 = 不提交该字段）
  const en: I18nFields = translated
    ? {
        title: translated.title || zh.title,
        summary: translated.summary || zh.summary,
        description: translated.description || zh.description,
        deliverables: translated.deliverables?.length
          ? joinLines(translated.deliverables)
          : zh.deliverables,
        goodFit: translated.goodFit?.length
          ? joinLines(translated.goodFit)
          : zh.goodFit,
        notFor: translated.notFor?.length
          ? joinLines(translated.notFor)
          : zh.notFor,
        tags: translated.tags?.styles?.length
          ? (translated.tags.styles as string[])
          : zh.tags,
      }
    : { ...zh };
  return {
    ...INITIAL_SKILL_FORM,
    i18n: { 'zh-CN': zh, 'en-US': en },
    activeLocale: 'zh-CN',
    version: base.version ?? '1.0.0',
    outputTypes: (base.outputTypes ?? []) as OutputType[],
    roles: base.roles ?? [],
    scenes: base.scenes ?? [],
    agents: base.agents ?? [],
    priceKind: (base.priceKind ?? 'free') === 'paid' ? 'paid' : 'free',
    priceAmount: base.priceAmount != null ? String(base.priceAmount) : '',
    packageFile: base.packageUrl
      ? [
          {
            name: packageNameFromUrl(base.packageUrl),
            size: 0,
            url: base.packageUrl,
            kind: 'file',
          },
        ]
      : [],
    tryOnlineUrl: base.tryOnlineUrl ?? '',
    mediaFiles: (base.media ?? []).map((m) => ({
      name: mediaNameFromUrl(m.url),
      size: 0,
      url: m.url,
      kind: m.kind,
    })),
    free: base.free,
    featured: base.featured,
  };
}

/** 主表 tags → 表单标签列表（自由标签即 styles 桶；缺省并入展示）。 */
function tagDisplayList(tags: SkillTags | undefined): string[] {
  return tags?.styles ?? [];
}

function packageNameFromUrl(url: string): string {
  const part = url.split('/').pop() ?? 'package.zip';
  return decodeURIComponent(part).replace(/^\w{8}-/, '');
}

function mediaNameFromUrl(url: string): string {
  const part = url.split('/').pop() ?? 'media';
  return decodeURIComponent(part).replace(/^\w{8}-/, '');
}

/** i18n 字段集 → API 载荷片段（数组拆分 + tags 桶）。 */
function i18nToPayload(fields: I18nFields) {
  return {
    title: fields.title.trim() || null,
    summary: fields.summary.trim() || null,
    description: fields.description.trim() || null,
    deliverables: splitLines(fields.deliverables),
    goodFit: splitLines(fields.goodFit),
    notFor: splitLines(fields.notFor),
    tags: { styles: fields.tags } as SkillTags,
  };
}

/** 判断 en 快照是否「无实质译文」（不提交 en locale）：
 *  - 与基线全同（未编辑过）→ 无意义译文行
 *  - 各字段全空（用户清空了译文 = 想回落基线）→ 同样不提交 */
export function i18nEqualsBaseline(zh: I18nFields, en: I18nFields): boolean {
  const same = (a: string, b: string) =>
    splitLines(a).join('\n') === splitLines(b).join('\n');
  const enEmpty =
    !en.title.trim() &&
    !en.summary.trim() &&
    !en.description.trim() &&
    splitLines(en.deliverables).length === 0 &&
    splitLines(en.goodFit).length === 0 &&
    splitLines(en.notFor).length === 0 &&
    en.tags.length === 0;
  if (enEmpty) return true;
  return (
    en.title.trim() === zh.title.trim() &&
    en.summary.trim() === zh.summary.trim() &&
    en.description.trim() === zh.description.trim() &&
    same(en.deliverables, zh.deliverables) &&
    same(en.goodFit, zh.goodFit) &&
    same(en.notFor, zh.notFor) &&
    [...en.tags].sort().join('|') === [...zh.tags].sort().join('|')
  );
}

/**
 * 表单状态 → API 载荷（SkillInput）。
 *
 * - 主表 ← base + zh 基线（title/summary/description/deliverables/good_fit/
 *   not_for/tags.styles）
 * - body.i18n['en-US'] 仅当 en 有实质差异才携带（design §3.2）
 * - free 派生列与 priceKind 保持一致（0003 迁移语义）
 */
export function toSkillInput(form: SkillFormState): SkillInput {
  const zh = form.i18n['zh-CN'];
  const en = form.i18n['en-US'];
  const zhPayload = i18nToPayload(zh);

  const input: SkillInput = {
    title: zhPayload.title ?? '',
    summary: zhPayload.summary ?? '',
    description: zhPayload.description ?? '',
    deliverables: zhPayload.deliverables ?? [],
    goodFit: zhPayload.goodFit ?? [],
    notFor: zhPayload.notFor ?? [],
    tags: zhPayload.tags,
    version: form.version.trim() || '1.0.0',
    outputTypes: form.outputTypes,
    roles: form.roles,
    scenes: form.scenes,
    agents: form.agents,
    priceKind: form.priceKind,
    priceAmount:
      form.priceKind === 'paid' && form.priceAmount
        ? Number(form.priceAmount)
        : null,
    free: form.priceKind === 'free',
    featured: form.featured,
    packageUrl: form.packageFile[0]?.url ?? '',
    tryOnlineUrl: form.tryOnlineUrl.trim(),
    ...(form.mediaFiles.length > 0
      ? {
          media: form.mediaFiles.map((f, i) => ({
            kind: f.kind === 'video' ? 'video' : 'image',
            url: f.url,
            alt: f.name,
            order: i,
          })),
        }
      : {}),
  };

  if (!i18nEqualsBaseline(zh, en)) {
    const enPayload = i18nToPayload(en);
    input.i18n = {
      'en-US': {
        title: enPayload.title,
        summary: enPayload.summary,
        description: enPayload.description,
        deliverables: enPayload.deliverables ?? null,
        goodFit: enPayload.goodFit ?? null,
        notFor: enPayload.notFor ?? null,
        tags: enPayload.tags,
      },
    };
  }

  return input;
}

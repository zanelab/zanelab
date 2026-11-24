import { describe, expect, it } from 'vitest';
import {
  activeSections,
  INITIAL_SKILL_FORM,
  parseDemoInput,
  parseMediaInput,
  splitList,
  toSkillInput,
  type SkillFormState,
} from './form-state';

/**
 * 表单状态层单测（任务 11-24-skills-detail-schema）。
 *
 * 覆盖：输出类型 → 专属分节映射、分节切换（值保留 + 提交裁剪）、清单文本
 * 解析、i18n 载荷产出规则。
 */

const base = (patch: Partial<SkillFormState> = {}): SkillFormState => ({
  ...INITIAL_SKILL_FORM,
  ...patch,
});

describe('activeSections（输出类型 → 专属分节）', () => {
  it('未选类型 → 无专属分节', () => {
    expect(activeSections([])).toEqual([]);
  });

  it('单选 → 对应分节', () => {
    expect(activeSections(['网页'])).toEqual(['网页']);
    expect(activeSections(['视频'])).toEqual(['视频']);
  });

  it('多选 → 并集（顺序按选中类型序）', () => {
    expect(activeSections(['网页', '视频'])).toEqual(['网页', '视频']);
  });
});

describe('toSkillInput（载荷装配 + 分节裁剪）', () => {
  it('标题必填语义由上层校验；载荷含基础字段', () => {
    const input = toSkillInput(base({ title: '  技能名  ' }));
    expect(input.title).toBe('技能名');
    expect(input.version).toBe('1.0.0');
  });

  it('未激活类型：专属字段不落库（切类型残留不污染）', () => {
    const input = toSkillInput(
      base({
        title: '技能',
        outputTypes: ['网页'],
        web: { tryOnlineUrl: 'https://demo', techStack: 'React' },
        // 视频分节的残留值（用户先选视频又取消）
        video: {
          duration: '40s',
          resolution: '4k',
          voiceLanguages: 'EN',
          apiKeys: 'K',
        },
      }),
    );
    expect(input.tryOnlineUrl).toBe('https://demo');
    expect(input.media).toBeUndefined();
    expect(input.demoExamples).toBeUndefined();
  });

  it('激活视频类型：演示示例落库', () => {
    const input = toSkillInput(
      base({
        title: '技能',
        outputTypes: ['视频'],
        demoExamples: '生成一段产品视频|https://x/v.webp',
      }),
    );
    expect(input.demoExamples).toEqual([
      { prompt: '生成一段产品视频', mediaUrl: 'https://x/v.webp' },
    ]);
  });

  it('价格三态：free / paid(amount) / requires_key(note+keys)', () => {
    const free = toSkillInput(base({ title: 'x', priceKind: 'free' }));
    expect(free.free).toBe(true);
    expect(free.priceAmount).toBeNull();

    const paid = toSkillInput(
      base({ title: 'x', priceKind: 'paid', priceAmount: '4.99' }),
    );
    expect(paid.free).toBe(false);
    expect(paid.priceAmount).toBe(4.99);

    const keyed = toSkillInput(
      base({
        title: 'x',
        priceKind: 'requires_key',
        priceNote: 'Needs FAL_KEY',
        requiresApiKey: 'FAL_KEY, ELEVENLABS_API_KEY',
      }),
    );
    expect(keyed.priceKind).toBe('requires_key');
    expect(keyed.priceNote).toBe('Needs FAL_KEY');
    expect(keyed.requiresApiKey).toEqual(['FAL_KEY', 'ELEVENLABS_API_KEY']);
  });

  it('清单字段：每行一条 → 字符串数组', () => {
    const input = toSkillInput(
      base({
        title: 'x',
        deliverables: '交付一\n交付二',
        goodFit: '适合团队, 适合个人',
      }),
    );
    expect(input.deliverables).toEqual(['交付一', '交付二']);
    expect(input.goodFit).toEqual(['适合团队', '适合个人']);
  });

  it('i18n：全空 → 不产出载荷；有值 → 按 locale 产出（空字段 null = 回落基线）', () => {
    const none = toSkillInput(base({ title: 'x' }));
    expect(none.i18n).toBeUndefined();

    const withI18n = toSkillInput(
      base({ title: 'x', i18nLocale: 'en-US', i18nTitle: 'EN title' }),
    );
    expect(withI18n.i18n?.['en-US']).toEqual({
      title: 'EN title',
      summary: null,
      description: null,
      taskExpression: null,
    });
  });
});

describe('文本解析工具', () => {
  it('splitList：逗号/中文逗号/换行分隔，去空去重', () => {
    expect(splitList('a，b,c\na')).toEqual(['a', 'b', 'c']);
  });

  it('parseMediaInput：裸 URL → image；kind|url → 对应 kind', () => {
    expect(parseMediaInput('https://x/a.png')).toEqual([
      { kind: 'image', url: 'https://x/a.png' },
    ]);
    expect(parseMediaInput('video|https://x/a.webp')).toEqual([
      { kind: 'video', url: 'https://x/a.webp' },
    ]);
  });

  it('parseDemoInput：prompt|mediaUrl', () => {
    expect(parseDemoInput('做一个官网|https://x/a.png')).toEqual([
      { prompt: '做一个官网', mediaUrl: 'https://x/a.png' },
    ]);
  });
});

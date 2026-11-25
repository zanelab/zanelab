import { describe, expect, it } from 'vitest';
import {
  formFromSkill,
  i18nEqualsBaseline,
  INITIAL_SKILL_FORM,
  splitLines,
  splitList,
  toSkillInput,
  type SkillFormState,
} from './form-state';
import type { SkillRecord } from '../../../api/skills';

/**
 * 表单状态层单测（任务 11-25-skills-form-upload：三区块 + 语言切换模型）。
 *
 * 覆盖：文本解析、编辑回填（en 回落基线）、语言切换语义（切换不清值）、
 * 提交裁剪（en 与基线全同不提交）、价格派生、package_url 落点。
 */

const base = (patch: Partial<SkillFormState> = {}): SkillFormState => ({
  ...INITIAL_SKILL_FORM,
  ...patch,
});

const zhPatch = (fields: Partial<SkillFormState['i18n']['zh-CN']>) => ({
  i18n: {
    ...INITIAL_SKILL_FORM.i18n,
    'zh-CN': { ...INITIAL_SKILL_FORM.i18n['zh-CN'], ...fields },
  },
});

describe('文本解析', () => {
  it('splitList：逗号/中文逗号/换行分隔，去空去重', () => {
    expect(splitList('a，b,c\na')).toEqual(['a', 'b', 'c']);
  });

  it('splitLines：仅换行分隔（条目可含逗号），去空去重', () => {
    expect(splitLines('交付一\n交付二\n交付一')).toEqual(['交付一', '交付二']);
    expect(splitLines('每行一条, 逗号保留')).toEqual(['每行一条, 逗号保留']);
  });
});

describe('formFromSkill（编辑回填）', () => {
  const baseRow = {
    id: 1,
    title: '薄荷暗夜',
    summary: '基线摘要',
    description: '基线描述',
    deliverables: ['交付一', '交付二'],
    goodFit: ['适合一'],
    notFor: ['不适合一'],
    tags: { scenarios: [], tasks: [], highlights: [], styles: ['标签A'] },
    version: '1.0.1',
    outputTypes: ['网页'],
    roles: ['设计师'],
    scenes: ['品牌'],
    agents: ['CC'],
    priceKind: 'free',
    priceAmount: null,
    free: true,
    featured: false,
    packageUrl: 'https://x/skill-assets/20261125/abcd1234-mypack.zip',
    tryOnlineUrl: 'https://demo',
    media: [
      {
        kind: 'image',
        url: 'https://x/skill-assets/20261125/abcd1234-shot.png',
        alt: '',
        order: 0,
      },
    ],
  } as unknown as SkillRecord;

  const enRow = {
    title: 'Mint Noir',
    summary: 'EN summary',
    description: '',
    deliverables: ['Deliverable one'],
    goodFit: [],
    notFor: [],
    tags: { scenarios: [], tasks: [], highlights: [], styles: ['Tag A'] },
  } as unknown as SkillRecord;

  it('基线落 zh；en 缺失字段回落基线展示', () => {
    const form = formFromSkill(baseRow, enRow);
    expect(form.i18n['zh-CN'].title).toBe('薄荷暗夜');
    expect(form.i18n['en-US'].title).toBe('Mint Noir');
    // en description 空 → 回落基线
    expect(form.i18n['en-US'].description).toBe('基线描述');
    // en goodFit 空数组 → 回落基线
    expect(form.i18n['en-US'].goodFit).toBe('适合一');
    expect(form.i18n['en-US'].deliverables).toBe('Deliverable one');
    expect(form.i18n['en-US'].tags).toEqual(['Tag A']);
  });

  it('base 落区块二/三：版本/枚举/定价/上传文件（name 从 URL 还原）', () => {
    const form = formFromSkill(baseRow, null);
    expect(form.version).toBe('1.0.1');
    expect(form.outputTypes).toEqual(['网页']);
    expect(form.priceKind).toBe('free');
    expect(form.packageFile).toHaveLength(1);
    expect(form.packageFile[0].url).toContain('mypack.zip');
    expect(form.packageFile[0].name).toBe('mypack.zip');
    expect(form.mediaFiles).toHaveLength(1);
    expect(form.mediaFiles[0].kind).toBe('image');
    expect(form.tryOnlineUrl).toBe('https://demo');
  });

  it('无译文（translated=null）→ en 整体回落 zh', () => {
    const form = formFromSkill(baseRow, null);
    expect(form.i18n['en-US'].title).toBe('薄荷暗夜');
    expect(form.i18n['en-US'].tags).toEqual(['标签A']);
  });
});

describe('toSkillInput（提交裁剪）', () => {
  it('主表 ← zh 基线（清单按行拆分；tags.styles）', () => {
    const input = toSkillInput(
      base({
        ...zhPatch({
          title: ' 技能 ',
          deliverables: '交付一\n交付二',
          tags: ['标签A', '标签B'],
        }),
        version: '2.0.0',
        priceKind: 'paid',
        priceAmount: '4.99',
        packageFile: [
          { name: 'p.zip', size: 1, url: 'https://x/p.zip', kind: 'file' },
        ],
      }),
    );
    expect(input.title).toBe('技能');
    expect(input.deliverables).toEqual(['交付一', '交付二']);
    expect(input.tags?.styles).toEqual(['标签A', '标签B']);
    expect(input.version).toBe('2.0.0');
    expect(input.priceKind).toBe('paid');
    expect(input.priceAmount).toBe(4.99);
    expect(input.free).toBe(false); // 派生列与 priceKind 一致
    expect(input.packageUrl).toBe('https://x/p.zip');
    expect(input.media).toBeUndefined(); // 无效果展示 → media 缺省（不传空数组——部分更新语义）
  });

  it('en 与基线全同 → 不提交 i18n（无意义译文行）', () => {
    const form = base(
      zhPatch({ title: '技能', summary: '摘要', deliverables: '交付一' }),
    );
    // en 回落 = 与 zh 相同（未编辑过）
    expect(i18nEqualsBaseline(form.i18n['zh-CN'], form.i18n['en-US'])).toBe(
      true,
    );
    expect(toSkillInput(form).i18n).toBeUndefined();
  });

  it('en 有差异 → 提交 i18n en-US（七字段 + tags 桶）', () => {
    const form: SkillFormState = {
      ...base(
        zhPatch({ title: '技能', deliverables: '交付一', tags: ['标签A'] }),
      ),
      i18n: {
        'zh-CN': {
          ...INITIAL_SKILL_FORM.i18n['zh-CN'],
          title: '技能',
          deliverables: '交付一',
          tags: ['标签A'],
        },
        'en-US': {
          ...INITIAL_SKILL_FORM.i18n['en-US'],
          title: 'Skill EN',
          deliverables: 'Deliverable one',
          tags: ['Tag A'],
        },
      },
    };
    const input = toSkillInput(form);
    expect(input.i18n?.['en-US']).toEqual({
      title: 'Skill EN',
      summary: null,
      description: null,
      deliverables: ['Deliverable one'],
      goodFit: [],
      notFor: [],
      tags: { styles: ['Tag A'] },
    });
  });

  it('切换语言不清值：zh/en 各自草稿独立保留', () => {
    const form = base({
      ...zhPatch({ title: '技能' }),
      activeLocale: 'en-US',
    });
    form.i18n['en-US'] = { ...form.i18n['en-US'], title: 'EN' };
    // zh 值不因 en 编辑丢失
    expect(form.i18n['zh-CN'].title).toBe('技能');
    expect(form.i18n['en-US'].title).toBe('EN');
  });
});

import { useTranslation } from 'react-i18next';
import { ChipGroup, Field } from '@zanelab/ui';
import type { OutputType, SkillFilterGroup } from '../data';
import type { SkillFormState } from './form-state';

/**
 * 表单分节组件（任务 11-24-skills-detail-schema）。
 *
 * 纯展示 + 受控回调（无内部状态）：state 归主组件（skill-form-modal）持有，
 * 分节只渲染并回调 onChange——切换输出类型时值保留、提交时按激活分节裁剪
 * （裁剪逻辑在 form-state.ts 的 toSkillInput）。
 *
 * 文案全走 t('skills.form.*')；标签候选来自语言包（scenarios/tasks/highlights
 * 存 i18n key，styles 存原文不译）。
 */

/** 文本多行输入（清单类：每行一条）。 */
function ListField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <textarea
        className="textarea textarea-sm bg-base-200 w-full"
        rows={3}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

/** 基础区：标题/用途句/摘要/描述/版本号（基线语言内容）。 */
export function BasicSection({
  form,
  set,
}: {
  form: SkillFormState;
  set: <K extends keyof SkillFormState>(
    key: K,
    value: SkillFormState[K],
  ) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <Field label={t('skills.form.fieldTitle')} required>
        <input
          type="text"
          className="input input-sm bg-base-200 w-full"
          placeholder={t('skills.form.titlePlaceholder')}
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
        />
      </Field>
      <Field label={t('skills.form.taskExpression')}>
        <input
          type="text"
          className="input input-sm bg-base-200 w-full"
          placeholder={t('skills.form.taskExpressionPlaceholder')}
          value={form.taskExpression}
          onChange={(e) => set('taskExpression', e.target.value)}
        />
      </Field>
      <Field label={t('skills.form.summary')}>
        <textarea
          className="textarea textarea-sm bg-base-200 w-full"
          rows={2}
          value={form.summary}
          onChange={(e) => set('summary', e.target.value)}
        />
      </Field>
      <Field label={t('skills.form.description')}>
        <textarea
          className="textarea textarea-sm bg-base-200 w-full"
          rows={3}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </Field>
      <Field label={t('skills.form.version')}>
        <input
          type="text"
          className="input input-sm bg-base-200 w-32"
          placeholder="1.0.0"
          value={form.version}
          onChange={(e) => set('version', e.target.value)}
        />
      </Field>
    </div>
  );
}

/** 输出类型区（多选；决定专属分节）。 */
export function OutputSection({
  form,
  set,
  groups,
}: {
  form: SkillFormState;
  set: <K extends keyof SkillFormState>(
    key: K,
    value: SkillFormState[K],
  ) => void;
  groups: SkillFilterGroup[];
}) {
  const { t } = useTranslation();
  const outputGroup = groups.find((g) => g.id === 'output');
  const options = (outputGroup?.options ?? []).map((o) => ({
    value: o.value,
    label: o.value,
    icon: o.icon,
  }));
  return (
    <ChipGroup
      label={t('skills.form.outputTypes')}
      options={options}
      selected={form.outputTypes as string[]}
      onToggle={(value) =>
        set('outputTypes', toggle(form.outputTypes, value as OutputType))
      }
    />
  );
}

/** 网页专属分节。 */
export function WebSection({
  form,
  set,
}: {
  form: SkillFormState;
  set: <K extends keyof SkillFormState>(
    key: K,
    value: SkillFormState[K],
  ) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <Field label={t('skills.form.web.tryOnlineUrl')}>
        <input
          type="url"
          className="input input-sm bg-base-200 w-full"
          placeholder="https://"
          value={form.web.tryOnlineUrl}
          onChange={(e) =>
            set('web', { ...form.web, tryOnlineUrl: e.target.value })
          }
        />
      </Field>
      <Field label={t('skills.form.web.techStack')}>
        <input
          type="text"
          className="input input-sm bg-base-200 w-full"
          value={form.web.techStack}
          onChange={(e) =>
            set('web', { ...form.web, techStack: e.target.value })
          }
        />
      </Field>
    </div>
  );
}

/** 幻灯片专属分节。 */
export function SlidesSection({
  form,
  set,
}: {
  form: SkillFormState;
  set: <K extends keyof SkillFormState>(
    key: K,
    value: SkillFormState[K],
  ) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <Field label={t('skills.form.slides.exportFormat')}>
        <select
          className="select select-sm bg-base-200 w-40"
          value={form.slides.exportFormat}
          onChange={(e) =>
            set('slides', { ...form.slides, exportFormat: e.target.value })
          }
        >
          <option value="pptx">PPTX</option>
          <option value="online">在线</option>
          <option value="both">PPTX + 在线</option>
        </select>
      </Field>
      <Field label={t('skills.form.slides.slideCount')}>
        <input
          type="text"
          className="input input-sm bg-base-200 w-32"
          placeholder="10–20"
          value={form.slides.slideCount}
          onChange={(e) =>
            set('slides', { ...form.slides, slideCount: e.target.value })
          }
        />
      </Field>
      <label className="text-base-content flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={form.slides.speakerNotes}
          onChange={(e) =>
            set('slides', { ...form.slides, speakerNotes: e.target.checked })
          }
        />
        {t('skills.form.slides.speakerNotes')}
      </label>
    </div>
  );
}

/** 视频专属分节。 */
export function VideoSection({
  form,
  set,
}: {
  form: SkillFormState;
  set: <K extends keyof SkillFormState>(
    key: K,
    value: SkillFormState[K],
  ) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <Field label={t('skills.form.video.duration')}>
        <input
          type="text"
          className="input input-sm bg-base-200 w-32"
          placeholder="40s"
          value={form.video.duration}
          onChange={(e) =>
            set('video', { ...form.video, duration: e.target.value })
          }
        />
      </Field>
      <Field label={t('skills.form.video.resolution')}>
        <select
          className="select select-sm bg-base-200 w-32"
          value={form.video.resolution}
          onChange={(e) =>
            set('video', { ...form.video, resolution: e.target.value })
          }
        >
          <option value="1080p">1080p</option>
          <option value="4k">4K</option>
        </select>
      </Field>
      <Field label={t('skills.form.video.voiceLanguages')}>
        <input
          type="text"
          className="input input-sm bg-base-200 w-full"
          placeholder="English, Chinese"
          value={form.video.voiceLanguages}
          onChange={(e) =>
            set('video', { ...form.video, voiceLanguages: e.target.value })
          }
        />
      </Field>
      <Field label={t('skills.form.video.apiKeys')}>
        <input
          type="text"
          className="input input-sm bg-base-200 w-full"
          placeholder="ELEVENLABS_API_KEY, FAL_KEY"
          value={form.video.apiKeys}
          onChange={(e) =>
            set('video', { ...form.video, apiKeys: e.target.value })
          }
        />
      </Field>
    </div>
  );
}

/** 图像专属分节。 */
export function ImageSection({
  form,
  set,
}: {
  form: SkillFormState;
  set: <K extends keyof SkillFormState>(
    key: K,
    value: SkillFormState[K],
  ) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <Field label={t('skills.form.image.sampleImages')}>
        <input
          type="text"
          className="input input-sm bg-base-200 w-full"
          placeholder={t('skills.form.image.sampleImagesPlaceholder')}
          value={form.image.sampleImages}
          onChange={(e) =>
            set('image', { ...form.image, sampleImages: e.target.value })
          }
        />
      </Field>
      <Field label={t('skills.form.image.dimensions')}>
        <input
          type="text"
          className="input input-sm bg-base-200 w-32"
          placeholder="1024×1024"
          value={form.image.dimensions}
          onChange={(e) =>
            set('image', { ...form.image, dimensions: e.target.value })
          }
        />
      </Field>
    </div>
  );
}

/** 内容清单区：交付物/适合/不适合。 */
export function ContentSection({
  form,
  set,
}: {
  form: SkillFormState;
  set: <K extends keyof SkillFormState>(
    key: K,
    value: SkillFormState[K],
  ) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <ListField
        label={t('skills.form.deliverables')}
        value={form.deliverables}
        onChange={(v) => set('deliverables', v)}
        placeholder={t('skills.form.deliverablesPlaceholder')}
      />
      <ListField
        label={t('skills.form.goodFit')}
        value={form.goodFit}
        onChange={(v) => set('goodFit', v)}
        placeholder={t('skills.form.goodFitPlaceholder')}
      />
      <ListField
        label={t('skills.form.notFor')}
        value={form.notFor}
        onChange={(v) => set('notFor', v)}
        placeholder={t('skills.form.notForPlaceholder')}
      />
    </div>
  );
}

/** 准备事项区：四段（You bring / Dependencies / Outside costs / Last tested）。 */
export function RequirementsSection({
  form,
  set,
}: {
  form: SkillFormState;
  set: <K extends keyof SkillFormState>(
    key: K,
    value: SkillFormState[K],
  ) => void;
}) {
  const { t } = useTranslation();
  const req = form.requirements;
  const patch = (key: keyof typeof req, value: string) =>
    set('requirements', { ...req, [key]: value });
  return (
    <div className="flex flex-col gap-3">
      <ListField
        label={t('skills.form.req.bring')}
        value={req.bring}
        onChange={(v) => patch('bring', v)}
      />
      <ListField
        label={t('skills.form.req.dependencies')}
        value={req.dependencies}
        onChange={(v) => patch('dependencies', v)}
      />
      <ListField
        label={t('skills.form.req.outsideCosts')}
        value={req.outsideCosts}
        onChange={(v) => patch('outsideCosts', v)}
      />
      <Field label={t('skills.form.req.lastTested')}>
        <input
          type="text"
          className="input input-sm bg-base-200 w-full"
          placeholder="v1.0.1 — Claude Code / Codex"
          value={req.lastTested}
          onChange={(e) => patch('lastTested', e.target.value)}
        />
      </Field>
    </div>
  );
}

/** 标签区：前三类从语言包候选多选（i18n key），styles 自由输入不译。 */
export function TagsSection({
  form,
  set,
}: {
  form: SkillFormState;
  set: <K extends keyof SkillFormState>(
    key: K,
    value: SkillFormState[K],
  ) => void;
}) {
  const { t } = useTranslation();
  const candidates = t('skills.form.tagCandidates', {
    returnObjects: true,
  }) as unknown as {
    scenarios?: string[];
    tasks?: string[];
    highlights?: string[];
  };
  const tags = form.tags;
  const patch = (key: 'scenarios' | 'tasks' | 'highlights', value: string) =>
    set('tags', { ...tags, [key]: toggle(tags[key] ?? [], value) });
  return (
    <div className="flex flex-col gap-3">
      <ChipGroup
        label={t('skills.form.tags.scenarios')}
        options={(candidates?.scenarios ?? []).map((v) => ({
          value: v,
          label: v,
        }))}
        selected={tags.scenarios ?? []}
        onToggle={(v) => patch('scenarios', v)}
      />
      <ChipGroup
        label={t('skills.form.tags.tasks')}
        options={(candidates?.tasks ?? []).map((v) => ({ value: v, label: v }))}
        selected={tags.tasks ?? []}
        onToggle={(v) => patch('tasks', v)}
      />
      <ChipGroup
        label={t('skills.form.tags.highlights')}
        options={(candidates?.highlights ?? []).map((v) => ({
          value: v,
          label: v,
        }))}
        selected={tags.highlights ?? []}
        onToggle={(v) => patch('highlights', v)}
      />
      <Field label={t('skills.form.tags.styles')}>
        <input
          type="text"
          className="input input-sm bg-base-200 w-full"
          placeholder={t('skills.form.tags.stylesPlaceholder')}
          value={(tags.styles ?? []).join(', ')}
          onChange={(e) =>
            set('tags', {
              ...tags,
              styles: e.target.value
                .split(/[,，]/)
                .map((v) => v.trim())
                .filter(Boolean),
            })
          }
        />
      </Field>
    </div>
  );
}

/** 兼容区：适配 agent / 驱动模型 / 外部工具。 */
export function CompatSection({
  form,
  set,
  groups,
  agentLabels,
}: {
  form: SkillFormState;
  set: <K extends keyof SkillFormState>(
    key: K,
    value: SkillFormState[K],
  ) => void;
  groups: SkillFilterGroup[];
  agentLabels: Record<string, string>;
}) {
  const { t } = useTranslation();
  const agentGroup = groups.find((g) => g.id === 'agent');
  return (
    <div className="flex flex-col gap-3">
      <ChipGroup
        label={t('skills.form.agents')}
        options={(agentGroup?.options ?? []).map((o) => ({
          value: o.value,
          label: agentLabels[o.value] ?? o.value,
        }))}
        selected={form.agents}
        onToggle={(v) => set('agents', toggle(form.agents, v))}
      />
      <Field label={t('skills.form.generatesWith')}>
        <input
          type="text"
          className="input input-sm bg-base-200 w-full"
          placeholder="Claude Fable 5.2 (Anthropic), GPT Image (OpenAI)"
          value={form.generatesWith}
          onChange={(e) => set('generatesWith', e.target.value)}
        />
      </Field>
      <Field label={t('skills.form.usesTools')}>
        <input
          type="text"
          className="input input-sm bg-base-200 w-full"
          placeholder="ChatCut, ElevenLabs"
          value={form.usesTools}
          onChange={(e) => set('usesTools', e.target.value)}
        />
      </Field>
    </div>
  );
}

/** 媒体区：画廊 + 演示示例（URL 文本录入）。 */
export function MediaSection({
  form,
  set,
}: {
  form: SkillFormState;
  set: <K extends keyof SkillFormState>(
    key: K,
    value: SkillFormState[K],
  ) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <ListField
        label={t('skills.form.media')}
        value={form.media}
        onChange={(v) => set('media', v)}
        placeholder={t('skills.form.mediaPlaceholder')}
      />
      <ListField
        label={t('skills.form.demoExamples')}
        value={form.demoExamples}
        onChange={(v) => set('demoExamples', v)}
        placeholder={t('skills.form.demoExamplesPlaceholder')}
      />
    </div>
  );
}

/** 定价区：free / paid / requires_key 三态。 */
export function PricingSection({
  form,
  set,
}: {
  form: SkillFormState;
  set: <K extends keyof SkillFormState>(
    key: K,
    value: SkillFormState[K],
  ) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <ChipGroup
        label={t('skills.form.price.kind')}
        options={[
          { value: 'free', label: t('skills.form.price.free') },
          { value: 'paid', label: t('skills.form.price.paid') },
          { value: 'requires_key', label: t('skills.form.price.requiresKey') },
        ]}
        selected={[form.priceKind]}
        onToggle={(v) => {
          if (v === 'free' || v === 'paid' || v === 'requires_key') {
            set('priceKind', v);
            set('free', v === 'free');
          }
        }}
      />
      {form.priceKind === 'paid' ? (
        <Field label={t('skills.form.price.amount')}>
          <input
            type="number"
            min="0"
            step="0.01"
            className="input input-sm bg-base-200 w-32"
            placeholder="4.99"
            value={form.priceAmount}
            onChange={(e) => set('priceAmount', e.target.value)}
          />
        </Field>
      ) : null}
      {form.priceKind === 'requires_key' ? (
        <>
          <Field label={t('skills.form.price.note')}>
            <input
              type="text"
              className="input input-sm bg-base-200 w-full"
              placeholder="Needs ELEVENLABS_API_KEY"
              value={form.priceNote}
              onChange={(e) => set('priceNote', e.target.value)}
            />
          </Field>
          <Field label={t('skills.form.price.apiKeys')}>
            <input
              type="text"
              className="input input-sm bg-base-200 w-full"
              placeholder="ELEVENLABS_API_KEY, FAL_KEY"
              value={form.requiresApiKey}
              onChange={(e) => set('requiresApiKey', e.target.value)}
            />
          </Field>
        </>
      ) : null}
      <label className="text-base-content flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={form.featured}
          onChange={(e) => set('featured', e.target.checked)}
        />
        {t('skills.form.featured')}
      </label>
    </div>
  );
}

/** i18n 译文区：选 locale + 四个可译字段（留空 = 回落基线）。 */
export function I18nSection({
  form,
  set,
}: {
  form: SkillFormState;
  set: <K extends keyof SkillFormState>(
    key: K,
    value: SkillFormState[K],
  ) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <Field label={t('skills.form.i18n.locale')}>
        <select
          className="select select-sm bg-base-200 w-32"
          value={form.i18nLocale}
          onChange={(e) => set('i18nLocale', e.target.value)}
        >
          <option value="en-US">en-US</option>
          <option value="zh-CN">zh-CN</option>
          <option value="zh-TW">zh-TW</option>
          <option value="ja">ja</option>
        </select>
      </Field>
      <Field label={t('skills.form.i18n.title')}>
        <input
          type="text"
          className="input input-sm bg-base-200 w-full"
          value={form.i18nTitle}
          onChange={(e) => set('i18nTitle', e.target.value)}
        />
      </Field>
      <Field label={t('skills.form.i18n.taskExpression')}>
        <input
          type="text"
          className="input input-sm bg-base-200 w-full"
          value={form.i18nTaskExpression}
          onChange={(e) => set('i18nTaskExpression', e.target.value)}
        />
      </Field>
      <Field label={t('skills.form.i18n.summary')}>
        <textarea
          className="textarea textarea-sm bg-base-200 w-full"
          rows={2}
          value={form.i18nSummary}
          onChange={(e) => set('i18nSummary', e.target.value)}
        />
      </Field>
      <Field label={t('skills.form.i18n.description')}>
        <textarea
          className="textarea textarea-sm bg-base-200 w-full"
          rows={3}
          value={form.i18nDescription}
          onChange={(e) => set('i18nDescription', e.target.value)}
        />
      </Field>
      <p className="text-base-content/50 text-xs">
        {t('skills.form.i18n.hint')}
      </p>
    </div>
  );
}

/** 通用：数组 toggle（存在则移除，不存在则追加）。 */
function toggle<T extends string>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

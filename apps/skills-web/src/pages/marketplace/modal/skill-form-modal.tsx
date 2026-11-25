import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChipGroup,
  Field,
  Modal,
  ModalActions,
  UploadDropzone,
  type UploadedFile,
} from '@zanelab/ui';
import { AGENT_LABEL, FILTER_GROUPS, type SkillItem } from '../data';
import { skillsApi } from '../../../api/skills';
import { uploadFile } from '../../../api/upload';
import { TagInput } from './tag-input';
import {
  formFromSkill,
  INITIAL_SKILL_FORM,
  toSkillInput,
  type I18nFields,
  type SkillFormState,
} from './form-state';

/*
 * Skill 新建/编辑表单弹窗 + 删除确认弹窗（11-23 R5/D3；11-24 Modal 壳；
 * 11-25 三区块重排 + 语言切换 + 上传链路）。
 *
 * 布局（用户设计稿）：
 * - 顶部居中语言胶囊（zh-CN/en-US = i18n SUPPORTED）——只控区块一；
 *   初始 = 站点当前语言（skillsApi.currentLocale()）
 * - 区块一 基本信息（可译字段，绑定 i18n[activeLocale]）
 * - 区块二 详细配置（枚举胶囊 + 定价 + 技能包上传）
 * - 区块三 展示与演示（演示地址 + 效果展示多文件上传）
 * 分割线 border-base-300；圆角联动：容器内联 --radius-selector:
 * var(--page-radius)——daisyUI 控件（input/textarea/select）圆角源即该变量，
 * 一处覆盖全部生效（Modal 内联的 --page-radius 22px 兜底供独立态）。
 *
 * 编辑回填：get(id)（基线）+ get(id, 'en-US')（译文）并行——en 缺失字段
 * 回落基线展示（formFromSkill）。
 *
 * 提交：toSkillInput（form-state.ts）——主表 ← base + zh；en 有实质差异才
 * 带 i18n['en-US']。成功 onSaved()（页面重拉列表 + 关弹窗），失败留弹窗。
 * aria 锚点 skill-form-title / skill-delete-title 不变（测试零修改）。
 */

const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const;
type FormLocale = (typeof SUPPORTED_LOCALES)[number];

interface SkillFormModalProps {
  open: boolean;
  /** 编辑目标（null = 新建）；打开期间快照为表单初值 */
  editing: SkillItem | null;
  onClose: () => void;
  /** 保存成功（新建/更新落库）——页面重拉列表并关弹窗 */
  onSaved: () => void;
}

export function SkillFormModal({
  open,
  editing,
  onClose,
  onSaved,
}: SkillFormModalProps) {
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState<SkillFormState>(INITIAL_SKILL_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  /** 现有标签全集（模糊搜索候选；编辑打开时从列表聚合） */
  const [tagCandidates, setTagCandidates] = useState<string[]>([]);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setError('');
      setSaving(false);
      const initialLocale = (SUPPORTED_LOCALES as readonly string[]).includes(
        i18n.language,
      )
        ? (i18n.language as FormLocale)
        : 'zh-CN';
      if (editing) {
        // 双请求并行：基线 + en 译文（en 缺失字段回落基线——formFromSkill）
        void Promise.all([
          skillsApi.get(editing.id),
          skillsApi.get(editing.id, 'en-US').catch(() => null),
        ]).then(([base, translated]) => {
          setForm(formFromSkill(base, translated));
        });
        // 标签候选：全库 tags.styles 去重（当前无独立标签端点）
        void skillsApi
          .list()
          .then((rows) => {
            const set = new Set<string>();
            for (const row of rows) {
              for (const tag of row.tags?.styles ?? []) set.add(tag);
            }
            setTagCandidates([...set]);
          })
          .catch(() => setTagCandidates([]));
      } else {
        setForm({
          ...INITIAL_SKILL_FORM,
          activeLocale: initialLocale,
        });
        setTagCandidates([]);
      }
    }
    wasOpen.current = open;
    // editing 在打开瞬间取值即可（后续编辑中不跟随——回填是初值语义）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof SkillFormState>(
    key: K,
    value: SkillFormState[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  /** 区块一字段绑定 i18n[activeLocale]（语言切换只影响本区）。 */
  const setI18n = (patch: Partial<I18nFields>) =>
    setForm((prev) => ({
      ...prev,
      i18n: {
        ...prev.i18n,
        [prev.activeLocale]: { ...prev.i18n[prev.activeLocale], ...patch },
      },
    }));

  const active = form.i18n[form.activeLocale];

  const submit = async () => {
    if (!form.i18n['zh-CN'].title.trim()) {
      setError(t('skills.form.titleRequired'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const input = toSkillInput(form);
      if (editing) await skillsApi.update(editing.id, input);
      else await skillsApi.create(input);
      onSaved();
    } catch (e) {
      setError((e as Error).message || t('skills.form.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      labelledBy="skill-form-title"
      title={
        editing ? t('skills.form.editTitle') : t('skills.form.createTitle')
      }
      widthClass="max-w-[560px]"
      footer={
        <ModalActions status={error || undefined}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
          >
            {t('skills.form.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={saving}
            onClick={() => void submit()}
          >
            {saving ? (
              <span className="loading loading-spinner loading-xs" />
            ) : null}
            {t('skills.form.save')}
          </button>
        </ModalActions>
      }
    >
      {/* 圆角联动：--radius-selector 是 daisyUI 控件圆角源，指向 --page-radius
          一处覆盖 input/textarea/select 全部（Modal 兜底 22px 供独立态） */}
      <div
        className="flex flex-col px-5 py-4"
        style={
          { '--radius-selector': 'var(--page-radius)' } as React.CSSProperties
        }
      >
        {/* 顶部：语言切换（居中；只控区块一） */}
        <div className="mb-4 flex justify-center">
          <div
            role="tablist"
            aria-label={t('skills.form.localeSwitch')}
            className="border-base-300 bg-base-200 inline-flex rounded-full border p-0.5"
          >
            {SUPPORTED_LOCALES.map((locale) => (
              <button
                key={locale}
                type="button"
                role="tab"
                aria-selected={form.activeLocale === locale}
                onClick={() => set('activeLocale', locale)}
                className={`rounded-full px-4 py-1 text-[13px] font-medium transition-colors ${
                  form.activeLocale === locale
                    ? 'bg-primary text-primary-content'
                    : 'text-base-content/60 hover:text-base-content'
                }`}
              >
                {locale === 'zh-CN'
                  ? t('skills.form.locale.zh')
                  : t('skills.form.locale.en')}
              </button>
            ))}
          </div>
        </div>

        {/* 区块一：基本信息（可译，随语言切换） */}
        <FormSection title={t('skills.form.section.basic')}>
          <div className="flex flex-col gap-3">
            <Field label={t('skills.form.fieldTitle')} required>
              <input
                type="text"
                className="input input-sm bg-base-200 w-full"
                placeholder={t('skills.form.titlePlaceholder')}
                value={active.title}
                onChange={(e) => setI18n({ title: e.target.value })}
              />
            </Field>
            <Field
              label={t('skills.form.summary')}
              hint={t('skills.form.markdownHint')}
            >
              <textarea
                className="textarea textarea-sm bg-base-200 w-full"
                rows={3}
                value={active.summary}
                onChange={(e) => setI18n({ summary: e.target.value })}
              />
            </Field>
            <Field
              label={t('skills.form.description')}
              hint={t('skills.form.markdownHint')}
            >
              <textarea
                className="textarea textarea-sm bg-base-200 w-full"
                rows={5}
                value={active.description}
                onChange={(e) => setI18n({ description: e.target.value })}
              />
            </Field>
            <Field
              label={t('skills.form.deliverables')}
              hint={t('skills.form.perLineHint')}
            >
              <textarea
                className="textarea textarea-sm bg-base-200 w-full"
                rows={3}
                value={active.deliverables}
                onChange={(e) => setI18n({ deliverables: e.target.value })}
              />
            </Field>
            <Field
              label={t('skills.form.goodFit')}
              hint={t('skills.form.perLineHint')}
            >
              <textarea
                className="textarea textarea-sm bg-base-200 w-full"
                rows={3}
                value={active.goodFit}
                onChange={(e) => setI18n({ goodFit: e.target.value })}
              />
            </Field>
            <Field
              label={t('skills.form.notFor')}
              hint={t('skills.form.perLineHint')}
            >
              <textarea
                className="textarea textarea-sm bg-base-200 w-full"
                rows={2}
                value={active.notFor}
                onChange={(e) => setI18n({ notFor: e.target.value })}
              />
            </Field>
            <Field label={t('skills.form.tags')}>
              <TagInput
                value={active.tags}
                onChange={(tags) => setI18n({ tags })}
                candidates={tagCandidates}
                placeholder={t('skills.form.tagsPlaceholder')}
              />
            </Field>
          </div>
        </FormSection>

        {/* 区块二：详细配置（语言无关） */}
        <FormSection title={t('skills.form.section.config')}>
          <div className="flex flex-col gap-3">
            <Field label={t('skills.form.version')}>
              <input
                type="text"
                className="input input-sm bg-base-200 w-32"
                placeholder="1.0.0"
                value={form.version}
                onChange={(e) => set('version', e.target.value)}
              />
            </Field>
            <ChipGroup
              label={t('skills.form.outputTypes')}
              options={optionsOf(FILTER_GROUPS, 'output')}
              selected={form.outputTypes as string[]}
              onToggle={(value) =>
                set(
                  'outputTypes',
                  toggle(
                    form.outputTypes,
                    value as SkillFormState['outputTypes'][number],
                  ),
                )
              }
            />
            <ChipGroup
              label={t('skills.form.roles')}
              options={optionsOf(FILTER_GROUPS, 'role')}
              selected={form.roles}
              onToggle={(value) => set('roles', toggle(form.roles, value))}
            />
            <ChipGroup
              label={t('skills.form.scenes')}
              options={optionsOf(FILTER_GROUPS, 'scene')}
              selected={form.scenes}
              onToggle={(value) => set('scenes', toggle(form.scenes, value))}
            />
            <ChipGroup
              label={t('skills.form.agents')}
              options={optionsOf(FILTER_GROUPS, 'agent').map((o) => ({
                value: o.value,
                label: AGENT_LABEL[o.value] ?? o.value,
              }))}
              selected={form.agents}
              onToggle={(value) => set('agents', toggle(form.agents, value))}
            />
            <ChipGroup
              label={t('skills.form.price.kind')}
              options={[
                { value: 'free', label: t('skills.form.price.free') },
                { value: 'paid', label: t('skills.form.price.paid') },
              ]}
              selected={[form.priceKind]}
              onToggle={(value) => {
                if (value === 'free' || value === 'paid')
                  set('priceKind', value);
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
            <Field label={t('skills.form.package')}>
              <PackageUpload
                value={form.packageFile}
                onChange={(files) => set('packageFile', files)}
              />
            </Field>
          </div>
        </FormSection>

        {/* 区块三：展示与演示（语言无关） */}
        <FormSection title={t('skills.form.section.showcase')}>
          <div className="flex flex-col gap-3">
            <Field label={t('skills.form.tryOnlineUrl')}>
              <input
                type="url"
                className="input input-sm bg-base-200 w-full"
                placeholder="https://"
                value={form.tryOnlineUrl}
                onChange={(e) => set('tryOnlineUrl', e.target.value)}
              />
            </Field>
            <Field label={t('skills.form.media')}>
              <MediaUpload
                value={form.mediaFiles}
                onChange={(files) => set('mediaFiles', files)}
              />
            </Field>
          </div>
        </FormSection>
      </div>
    </Modal>
  );
}

/** 区块容器：标题 + 浅灰分割线（区块间 border-t）。 */
function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-base-300 mt-5 flex flex-col gap-3 border-t pt-4 first:mt-0 first:border-t-0 first:pt-0">
      <h3 className="text-base-content/60 text-xs font-semibold tracking-wider uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** FILTER_GROUPS 按组 id 取胶囊选项。 */
function optionsOf(
  groups: typeof FILTER_GROUPS,
  id: 'output' | 'role' | 'scene' | 'agent',
) {
  return (groups.find((g) => g.id === id)?.options ?? []).map((o) => ({
    value: o.value,
    label: o.value,
    icon: o.icon,
  }));
}

/** 通用：数组 toggle（存在则移除，不存在则追加）。 */
function toggle<T extends string>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

/** 技能包上传（单文件 zip；新上传替换）。 */
function PackageUpload({
  value,
  onChange,
}: {
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
}) {
  const { t } = useTranslation();
  return (
    <UploadDropzone
      accept=".zip"
      label={t('skills.form.upload.drop')}
      hint={t('skills.form.upload.packageHint')}
      errorText={t('skills.form.upload.failed')}
      upload={uploadFile}
      value={value}
      onChange={onChange}
    />
  );
}

/** 效果展示上传（多文件图片/视频；追加）。 */
function MediaUpload({
  value,
  onChange,
}: {
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
}) {
  const { t } = useTranslation();
  const files = useMemo(
    () =>
      value.map((f) => ({
        ...f,
        kind: f.kind === 'file' ? ('image' as const) : f.kind,
      })),
    [value],
  );
  return (
    <UploadDropzone
      multiple
      accept="image/*,video/*"
      label={t('skills.form.upload.drop')}
      hint={t('skills.form.upload.mediaHint')}
      errorText={t('skills.form.upload.failed')}
      upload={uploadFile}
      value={files}
      onChange={onChange}
    />
  );
}

interface DeleteConfirmModalProps {
  /** 删除目标（null = 弹窗关闭） */
  target: SkillItem | null;
  onClose: () => void;
  /** 删除成功——页面重拉列表并关弹窗 */
  onSaved: () => void;
}

export function DeleteConfirmModal({
  target,
  onClose,
  onSaved,
}: DeleteConfirmModalProps) {
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  // 换目标/关闭时清错误与进行中态（target=null 关闭是主路径，这里兜脏态）
  useEffect(() => {
    setError('');
    setDeleting(false);
  }, [target?.id, target === null]);

  const submit = async () => {
    if (!target) return;
    setDeleting(true);
    setError('');
    try {
      await skillsApi.remove(target.id);
      onSaved();
    } catch (e) {
      setError((e as Error).message || t('skills.form.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      open={target !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      labelledBy="skill-delete-title"
      title={t('skills.form.deleteTitle')}
      widthClass="max-w-[420px]"
      footer={
        <ModalActions status={error || undefined}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
          >
            {t('skills.form.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-error btn-sm"
            disabled={deleting}
            onClick={() => void submit()}
          >
            {deleting ? (
              <span className="loading loading-spinner loading-xs" />
            ) : null}
            {t('skills.form.delete')}
          </button>
        </ModalActions>
      }
    >
      <div className="text-base-content/70 px-5 py-5 text-sm">
        {t('skills.form.deleteConfirm', { title: target?.title ?? '' })}
      </div>
    </Modal>
  );
}

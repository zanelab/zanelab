import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalActions } from '@zanelab/ui';
import { AGENT_LABEL, FILTER_GROUPS, type SkillItem } from '../data';
import { skillsApi } from '../../../api/skills';
import {
  BasicSection,
  CompatSection,
  ContentSection,
  I18nSection,
  ImageSection,
  MediaSection,
  OutputSection,
  PricingSection,
  RequirementsSection,
  SlidesSection,
  TagsSection,
  VideoSection,
  WebSection,
} from './form-sections';
import {
  activeSections,
  INITIAL_SKILL_FORM,
  toSkillInput,
  type SkillFormState,
} from './form-state';

/*
 * Skill 新建/编辑表单弹窗 + 删除确认弹窗（任务 11-23-skills-crud-mock R5/D3；
 * 11-24-skills-modal-package 换 @zanelab/ui Modal 壳；
 * 11-24-skills-detail-schema 详情页字段 + 按输出类型动态分节）。
 *
 * 形态：受控 Modal（packages/ui/src/modal——受控 open/onOpenChange，关闭时机
 * 由调用方决定）。不用原生 showModal()/`method="dialog"`：提交要走 skillsApi
 * 异步链路，成功才经 onSaved() 关弹窗（页面重拉列表），失败留在弹窗内提示。
 * open=false 由 Modal 内部不挂载；aria-labelledby 锚点（skill-form-title /
 * skill-delete-title）经 Modal labelledBy 保持——marketplace.test.tsx 期望
 * 零修改。
 *
 * 分节：state 在本组件持有（分节组件纯受控），按 outputTypes 激活专属分节
 * （web/slides/video/image，多选=并集；切换不清值，提交时裁剪——见 form-state.ts）。
 *
 * 权限显隐不在本组件——入口（上传按钮 / 卡片操作钮）各自包 Permission，
 * 本组件只在「已经打开」的前提下工作（守卫在触发点，单一判定处）。
 */

/** 编辑回填：接口行 → 表单状态（缺省字段沿用 INITIAL）。 */
function formFromSkill(skill: SkillItem): SkillFormState {
  return {
    ...INITIAL_SKILL_FORM,
    title: skill.title,
    outputTypes: skill.outputTypes,
  };
}

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
  const { t } = useTranslation();
  // 初值只在「从关到开」时快照（open 变 true 的 effect）：编辑中改字段不会被
  // 重渲染重置，也避免复用上一次打开的脏值
  const [form, setForm] = useState<SkillFormState>(INITIAL_SKILL_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setForm(editing ? formFromSkill(editing) : INITIAL_SKILL_FORM);
      setError('');
      setSaving(false);
    }
    wasOpen.current = open;
    // editing 在打开瞬间取值即可（后续编辑中不跟随——回填是初值语义）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof SkillFormState>(
    key: K,
    value: SkillFormState[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const sections = activeSections(form.outputTypes);

  const submit = async () => {
    if (!form.title.trim()) {
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
      <div className="flex flex-col gap-5 px-5 py-5">
        <Section title={t('skills.form.section.basic')}>
          <BasicSection form={form} set={set} />
        </Section>

        <Section title={t('skills.form.section.output')}>
          <OutputSection form={form} set={set} groups={FILTER_GROUPS} />
        </Section>

        {/* 类型专属分节：按 outputTypes 激活（多选=并集） */}
        {sections.includes('网页') ? (
          <Section title={t('skills.form.section.web')}>
            <WebSection form={form} set={set} />
          </Section>
        ) : null}
        {sections.includes('幻灯片') ? (
          <Section title={t('skills.form.section.slides')}>
            <SlidesSection form={form} set={set} />
          </Section>
        ) : null}
        {sections.includes('视频') ? (
          <Section title={t('skills.form.section.video')}>
            <VideoSection form={form} set={set} />
          </Section>
        ) : null}
        {sections.includes('图像') ? (
          <Section title={t('skills.form.section.image')}>
            <ImageSection form={form} set={set} />
          </Section>
        ) : null}

        <Section title={t('skills.form.section.content')}>
          <ContentSection form={form} set={set} />
        </Section>

        <Section title={t('skills.form.section.requirements')}>
          <RequirementsSection form={form} set={set} />
        </Section>

        <Section title={t('skills.form.section.tags')}>
          <TagsSection form={form} set={set} />
        </Section>

        <Section title={t('skills.form.section.compat')}>
          <CompatSection
            form={form}
            set={set}
            groups={FILTER_GROUPS}
            agentLabels={AGENT_LABEL}
          />
        </Section>

        <Section title={t('skills.form.section.media')}>
          <MediaSection form={form} set={set} />
        </Section>

        <Section title={t('skills.form.section.pricing')}>
          <PricingSection form={form} set={set} />
        </Section>

        <Section title={t('skills.form.section.i18n')}>
          <I18nSection form={form} set={set} />
        </Section>
      </div>
    </Modal>
  );
}

/** 分节容器（标题 + 内容）。 */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-base-300 flex flex-col gap-2 border-t pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-base-content/60 text-xs font-semibold tracking-wider uppercase">
        {title}
      </h3>
      {children}
    </section>
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

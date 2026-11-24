import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChipGroup, Field, Modal, ModalActions } from '@zanelab/ui';
import {
  AGENT_LABEL,
  FILTER_GROUPS,
  type OutputType,
  type SkillItem,
} from '../data';
import { skillsApi, type SkillInput } from '../../../api/skills';

/*
 * Skill 新建/编辑表单弹窗 + 删除确认弹窗（任务 11-23-skills-crud-mock R5/D3；
 * 11-24-skills-modal-package 换 @zanelab/ui Modal 壳 + 表单原语消费）。
 *
 * 形态：受控 Modal（packages/ui/src/modal——受控 open/onOpenChange，关闭时机
 * 由调用方决定）。不用原生 showModal()/`method="dialog"`：提交要走 skillsApi
 * 异步链路，成功才经 onSaved() 关弹窗（页面重拉列表），失败留在弹窗内提示。
 * open=false 由 Modal 内部不挂载；aria-labelledby 锚点（skill-form-title /
 * skill-delete-title）经 Modal labelledBy 保持——marketplace.test.tsx 期望
 * 零修改。
 *
 * 职责拆分：
 * - SkillFormModal：新建/编辑双形态（mode 由调用方传 editing 行是否为 null）。
 *   提交 → skillsApi.create / update；成功 onSaved()；失败 ModalActions status
 *   展示接口 msg（Error(msg)，api 层已归一）。
 * - DeleteConfirmModal：确认 → skillsApi.remove；成功 onSaved()；同上。
 * 权限显隐不在本组件——入口（上传按钮 / 卡片操作钮）各自包 Permission，
 * 本组件只在「已经打开」的前提下工作（守卫在触发点，单一判定处）。
 */

/** 表单初始值（新建缺省 / 编辑回填同一形状）。 */
interface FormState {
  title: string;
  free: boolean;
  featured: boolean;
  outputTypes: OutputType[];
  roles: string[];
  scenes: string[];
  agents: string[];
  rating: number;
  tone: SkillItem['tone'];
}

const TONES: SkillItem['tone'][] = [
  'primary',
  'secondary',
  'accent',
  'info',
  'success',
  'warning',
];

const ALL_AGENTS = Object.keys(AGENT_LABEL);

const OUTPUT_OPTIONS = (
  FILTER_GROUPS.find((group) => group.id === 'output')?.options ?? []
).map((option) => option.value) as OutputType[];

const ROLE_OPTIONS = (
  FILTER_GROUPS.find((group) => group.id === 'role')?.options ?? []
).map((option) => option.value);

const SCENE_OPTIONS = (
  FILTER_GROUPS.find((group) => group.id === 'scene')?.options ?? []
).map((option) => option.value);

const INITIAL_FORM: FormState = {
  title: '',
  free: true,
  featured: false,
  outputTypes: [],
  roles: [],
  scenes: [],
  agents: [],
  rating: 3,
  tone: 'primary',
};

function formFromSkill(skill: SkillItem): FormState {
  return {
    title: skill.title,
    free: skill.free,
    featured: skill.featured,
    outputTypes: [...skill.outputTypes],
    roles: [...skill.roles],
    scenes: [...skill.scenes],
    agents: [...skill.agents],
    rating: skill.rating,
    tone: skill.tone,
  };
}

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
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
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setForm(editing ? formFromSkill(editing) : INITIAL_FORM);
      setError('');
      setSaving(false);
    }
    wasOpen.current = open;
    // editing 在打开瞬间取值即可（后续编辑中不跟随——回填是初值语义）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!form.title.trim()) {
      setError(t('skills.form.titleRequired'));
      return;
    }
    setSaving(true);
    setError('');
    const input: SkillInput = {
      title: form.title.trim(),
      free: form.free,
      featured: form.featured,
      outputTypes: form.outputTypes,
      roles: form.roles,
      scenes: form.scenes,
      rating: form.rating,
      tone: form.tone,
      agents: form.agents,
    };
    try {
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
      widthClass="max-w-[480px]"
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
      <div className="flex flex-col gap-4 px-5 py-5">
        <Field label={t('skills.form.fieldTitle')} required>
          <input
            type="text"
            className="input input-sm bg-base-200 w-full"
            placeholder={t('skills.form.titlePlaceholder')}
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
          />
        </Field>

        <div className="flex items-center gap-6">
          <label className="text-base-content flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={form.free}
              onChange={(e) => set('free', e.target.checked)}
            />
            {t('skills.form.free')}
          </label>
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

        <ChipGroup
          label={t('skills.form.outputTypes')}
          options={OUTPUT_OPTIONS.map((value) => ({ value, label: value }))}
          selected={form.outputTypes}
          onToggle={(value) =>
            set(
              'outputTypes',
              toggleValue(form.outputTypes, value) as OutputType[],
            )
          }
        />
        <ChipGroup
          label={t('skills.form.roles')}
          options={ROLE_OPTIONS.map((value) => ({ value, label: value }))}
          selected={form.roles}
          onToggle={(value) => set('roles', toggleValue(form.roles, value))}
        />
        <ChipGroup
          label={t('skills.form.scenes')}
          options={SCENE_OPTIONS.map((value) => ({ value, label: value }))}
          selected={form.scenes}
          onToggle={(value) => set('scenes', toggleValue(form.scenes, value))}
        />
        <ChipGroup
          label={t('skills.form.agents')}
          options={ALL_AGENTS.map((value) => ({
            value,
            label: AGENT_LABEL[value] ?? value,
          }))}
          selected={form.agents}
          onToggle={(value) => set('agents', toggleValue(form.agents, value))}
        />

        <div className="flex items-center gap-6">
          <Field label={t('skills.form.rating')}>
            <select
              className="select select-sm bg-base-200 w-28"
              value={form.rating}
              onChange={(e) => set('rating', Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('skills.form.tone')}>
            <select
              className="select select-sm bg-base-200 w-32"
              value={form.tone}
              onChange={(e) => set('tone', e.target.value as SkillItem['tone'])}
            >
              {TONES.map((tone) => (
                <option key={tone} value={tone}>
                  {t(`skills.tone.${tone}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>
    </Modal>
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

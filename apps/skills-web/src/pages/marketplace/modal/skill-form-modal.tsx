import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AGENT_LABEL,
  FILTER_GROUPS,
  type OutputType,
  type SkillItem,
} from '../data';
import { skillsApi, type SkillInput } from '../../../api/skills';

/*
 * Skill 新建/编辑表单弹窗 + 删除确认弹窗（任务 11-23-skills-crud-mock R5/D3）。
 *
 * 形态（iam-web RoleManagementPage 同款）：受控 `dialog.modal.modal-open`——
 * 不用原生 showModal()/`method="dialog"`：提交要走 skillsApi 异步链路，
 * 成功才关弹窗，失败留在弹窗内提示。条件渲染（open=false 不挂载）+ 显式
 * `open` 属性：open 属性是浏览器可达性语义（无障碍树可见）的来源，jsdom 的
 * 角色查询（byRole）也依赖它（无 open 的 dialog 按 spec 不渲染内容）。
 *
 * 职责拆分：
 * - SkillFormModal：新建/编辑双形态（mode 由调用方传 editing 行是否为 null）。
 *   提交 → skillsApi.create / update；成功 onSaved()（页面重拉列表 + 关弹窗）；
 *   失败 alert-error 展示接口 msg（Error(msg)，api 层已归一）。
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

  if (!open) return null;

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
    <dialog
      className="modal modal-open"
      open
      aria-labelledby="skill-form-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="modal-box bg-base-100 max-w-120 rounded-(--page-radius)">
        <h3
          id="skill-form-title"
          className="text-base-content text-lg font-semibold"
        >
          {editing ? t('skills.form.editTitle') : t('skills.form.createTitle')}
        </h3>
        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-base-content text-sm">
              <span className="text-error">*</span>{' '}
              {t('skills.form.fieldTitle')}
            </span>
            <input
              type="text"
              className="input input-sm bg-base-200 w-full"
              placeholder={t('skills.form.titlePlaceholder')}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </label>

          <div className="flex items-center gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={form.free}
                onChange={(e) => set('free', e.target.checked)}
              />
              {t('skills.form.free')}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={form.featured}
                onChange={(e) => set('featured', e.target.checked)}
              />
              {t('skills.form.featured')}
            </label>
          </div>

          <CheckboxGroup
            label={t('skills.form.outputTypes')}
            options={OUTPUT_OPTIONS}
            selected={form.outputTypes}
            onToggle={(value) =>
              set(
                'outputTypes',
                toggleValue(form.outputTypes, value) as OutputType[],
              )
            }
          />
          <CheckboxGroup
            label={t('skills.form.roles')}
            options={ROLE_OPTIONS}
            selected={form.roles}
            onToggle={(value) => set('roles', toggleValue(form.roles, value))}
          />
          <CheckboxGroup
            label={t('skills.form.scenes')}
            options={SCENE_OPTIONS}
            selected={form.scenes}
            onToggle={(value) => set('scenes', toggleValue(form.scenes, value))}
          />
          <CheckboxGroup
            label={t('skills.form.agents')}
            options={ALL_AGENTS}
            labels={AGENT_LABEL}
            selected={form.agents}
            onToggle={(value) => set('agents', toggleValue(form.agents, value))}
          />

          <div className="flex items-center gap-6">
            <label className="flex flex-col gap-1">
              <span className="text-base-content text-sm">
                {t('skills.form.rating')}
              </span>
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
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-base-content text-sm">
                {t('skills.form.tone')}
              </span>
              <select
                className="select select-sm bg-base-200 w-32"
                value={form.tone}
                onChange={(e) =>
                  set('tone', e.target.value as SkillItem['tone'])
                }
              >
                {TONES.map((tone) => (
                  <option key={tone} value={tone}>
                    {t(`skills.tone.${tone}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error ? (
          <div role="alert" className="alert alert-error mt-3 text-sm">
            <span>{error}</span>
          </div>
        ) : null}

        <div className="modal-action">
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
        </div>
      </div>
    </dialog>
  );
}

/** 多选组（checkbox 行 + label 文案）：role/scene/output 走数据键 i18n，agent 用全称。 */
function CheckboxGroup({
  label,
  options,
  selected,
  onToggle,
  labels,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  /** 可选映射（agent 组：缩写码 → 品牌全称，不翻译）；缺省 = 原值 */
  labels?: Record<string, string>;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-base-content text-sm">{label}</span>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {options.map((value) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-1.5 text-[13px]"
          >
            <input
              type="checkbox"
              className="checkbox checkbox-xs"
              checked={selected.includes(value)}
              onChange={() => onToggle(value)}
            />
            {labels?.[value] ?? value}
          </label>
        ))}
      </div>
    </div>
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
  if (!target) return null;

  const submit = async () => {
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
    <dialog
      className="modal modal-open"
      open
      aria-labelledby="skill-delete-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="modal-box bg-base-100 max-w-100 rounded-(--page-radius)">
        <h3
          id="skill-delete-title"
          className="text-base-content text-lg font-semibold"
        >
          {t('skills.form.deleteTitle')}
        </h3>
        <p className="text-base-content/70 mt-3 text-sm">
          {t('skills.form.deleteConfirm', { title: target.title })}
        </p>
        {error ? (
          <div role="alert" className="alert alert-error mt-3 text-sm">
            <span>{error}</span>
          </div>
        ) : null}
        <div className="modal-action">
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
        </div>
      </div>
    </dialog>
  );
}

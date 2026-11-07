import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { getProps } from '../props';
import { rolesApi, type RoleRecord } from '../api/roles';
import { menusApi, type MenuItemRecord } from '../api/menus';
import { showToast } from '../utils/notify';

/*
 * 角色管理页（任务 11-06）——RBAC 授权界面。
 *
 * 布局：左右两栏（左约 2/3 角色表 + 分页；右约 1/3 菜单树 checkbox，底部还原/保存）。
 * 语义：勾选菜单树 → 保存 = 把勾选菜单的 code 全量写入 role_permissions；
 *       还原 = 回到选中角色时的初始 code 集合（不发请求）。
 *
 * 树勾选三态：checked（全选）/ indeterminate（部分）/ unchecked；勾选父节点级联
 * 全选子树，子节点全选→父 checked、部分→父 indeterminate、全不选→父 unchecked。
 * 收集时只收勾选节点自身 code（不含半选父节点的空壳）。
 */

/** 勾选状态：勾选的节点 id 集合 + 初始快照（还原用）。 */
type CheckState = { checked: Set<number>; initial: Set<number> };

/** 平铺树（递归收集 code 用）。 */
function flattenNodes(nodes: MenuItemRecord[]): MenuItemRecord[] {
  return nodes.flatMap((n) => [n, ...flattenNodes(n.children ?? [])]);
}

/** 收集子树全部 code（勾选父节点时级联）。 */
function collectSubtreeIds(node: MenuItemRecord): number[] {
  return [node.id, ...(node.children ?? []).flatMap(collectSubtreeIds)];
}

export function RoleManagementPage() {
  const { t } = useTranslation();
  const props = getProps();
  const prefs = {
    mode: 'light',
    colorPrimary: '#3b82f6',
    radius: 0.5,
    fontSize: 14,
    ...(props.preferences as Record<string, unknown> | undefined),
  } as {
    mode?: string;
    colorPrimary?: string;
    radius?: number;
    fontSize?: number;
  };
  const dark = prefs.mode === 'dark';

  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [tree, setTree] = useState<MenuItemRecord[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleRecord | null>(null);
  const [check, setCheck] = useState<CheckState>({
    checked: new Set(),
    initial: new Set(),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [loadError, setLoadError] = useState('');
  // 角色新建/编辑弹窗（null = 关闭；editing 非 null = 编辑态）
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RoleRecord | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formError, setFormError] = useState('');
  // 删除确认弹窗
  const [deleteTarget, setDeleteTarget] = useState<RoleRecord | null>(null);
  const [deleteError, setDeleteError] = useState('');
  // 分页
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [roleList, menuTree] = await Promise.all([
        rolesApi.list(),
        menusApi.list(),
      ]);
      setRoles(roleList);
      setTree(menuTree);
    } catch (e) {
      const msg =
        e instanceof Error && e.message ? e.message : t('iam.role.loadFailed');
      setLoadError(msg);
      // 403 → 后置只读（游客/无权限看不到授权界面）
      if (/401|403|登录|权限/i.test(msg)) setReadOnly(true);
      const status = (e as { response?: { status?: number } })?.response
        ?.status;
      const integration = typeof getProps().onNotify === 'function';
      const handled =
        status === 403 ||
        (status !== undefined && status >= 500) ||
        status === undefined;
      showToast(msg, 'error', integration ? !handled : true);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** 选中角色 → 拉授权集合 → 初始化勾选状态。 */
  const selectRole = async (role: RoleRecord) => {
    setSelectedRole(role);
    try {
      const perms = await rolesApi.getPermissions(role.id);
      const permSet = new Set(perms);
      // 授权集合（permission 字符串）→ 勾选的节点 id（permission 命中的节点勾选）
      const initialIds = new Set(
        flattenNodes(tree)
          .filter((n) => n.permission && permSet.has(n.permission))
          .map((n) => n.id),
      );
      setCheck({ checked: new Set(initialIds), initial: new Set(initialIds) });
    } catch (e) {
      const msg =
        e instanceof Error && e.message ? e.message : t('iam.role.loadFailed');
      if (/401|403|登录|权限/i.test(msg)) setReadOnly(true);
      showToast(msg);
    }
  };

  /** 勾选/取消节点 + 子树级联。 */
  const toggleNode = (node: MenuItemRecord, shouldCheck: boolean) => {
    setCheck((prev) => {
      const next = new Set(prev.checked);
      for (const id of collectSubtreeIds(node)) {
        if (shouldCheck) next.add(id);
        else next.delete(id);
      }
      return { ...prev, checked: next };
    });
  };

  /** 节点三态：自身 checked / 部分子选中 → indeterminate / 否则 unchecked。 */
  const nodeState = (
    node: MenuItemRecord,
    checked: Set<number>,
  ): 'checked' | 'indeterminate' | 'unchecked' => {
    if (checked.has(node.id)) return 'checked';
    const children = node.children ?? [];
    if (children.length === 0) return 'unchecked';
    const anyChecked = flattenNodes(children).some((c) => checked.has(c.id));
    return anyChecked ? 'indeterminate' : 'unchecked';
  };

  /** 还原到初始 code 集合。 */
  const revert = () => {
    setCheck((prev) => ({ ...prev, checked: new Set(prev.initial) }));
  };

  /** 打开新建/编辑弹窗（editing = 角色则为编辑态）。 */
  const openForm = (role?: RoleRecord) => {
    setFormError('');
    setEditing(role ?? null);
    setFormName(role?.name ?? '');
    setFormCode(role?.code ?? '');
    setFormOpen(true);
  };

  /** 提交新建/编辑（编辑内置角色被服务端 1019 拒绝）。 */
  const submitForm = async () => {
    if (saving) return;
    const name = formName.trim();
    if (!name) {
      setFormError(t('iam.role.nameRequired'));
      return;
    }
    if (!editing && !formCode.trim()) {
      setFormError(t('iam.role.codeRequired'));
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        await rolesApi.update(editing.id, name);
      } else {
        await rolesApi.create(formCode.trim(), name);
      }
      setFormOpen(false);
      showToast(t('iam.role.created'), 'success');
      await reload();
    } catch (e) {
      const msg =
        e instanceof Error && e.message ? e.message : t('iam.role.saveFailed');
      if (/401|403|登录|权限/i.test(msg)) {
        setReadOnly(true);
        setFormOpen(false);
      }
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  /** 提交删除（内置角色服务端 1019 拒绝；成功后若删的是选中角色则清选中态）。 */
  const submitDelete = async () => {
    if (!deleteTarget || saving) return;
    setSaving(true);
    setDeleteError('');
    try {
      await rolesApi.remove(deleteTarget.id);
      if (selectedRole?.id === deleteTarget.id) setSelectedRole(null);
      setDeleteTarget(null);
      showToast(t('iam.role.deleted'), 'success');
      await reload();
    } catch (e) {
      const msg =
        e instanceof Error && e.message
          ? e.message
          : t('iam.role.deleteFailed');
      if (/401|403|登录|权限/i.test(msg)) setReadOnly(true);
      setDeleteError(msg);
    } finally {
      setSaving(false);
    }
  };

  /** 保存：收集勾选 code（含 '*' 展开，admin 角色勾选全部时的语义）→ PUT。 */
  const save = async () => {
    if (!selectedRole || saving) return;
    setSaving(true);
    try {
      // 勾选节点 → 收集其 permission（非空才入集合；空 permission 的公开节点不产生授权项）
      const perms = flattenNodes(tree)
        .filter((n) => check.checked.has(n.id) && n.permission)
        .map((n) => n.permission!);
      await rolesApi.savePermissions(selectedRole.id, perms);
      // 保存成功后把新集合设为初始（还原基线刷新）
      setCheck((prev) => ({ ...prev, initial: new Set(prev.checked) }));
      showToast(t('iam.role.saved'), 'success');
      await reload();
    } catch (e) {
      const msg =
        e instanceof Error && e.message ? e.message : t('iam.role.saveFailed');
      if (/401|403|登录|权限/i.test(msg)) setReadOnly(true);
      showToast(msg);
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(roles.length / PAGE_SIZE));
  const pageRoles = roles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div
      data-theme={dark ? 'dark' : undefined}
      style={
        {
          '--page-primary': prefs.colorPrimary,
          '--page-radius': `${prefs.radius}rem`,
          '--page-font': `${prefs.fontSize}px`,
        } as CSSProperties
      }
      className="text-base-content min-h-screen p-6"
    >
      <h1 className="text-xl font-semibold">{t('iam.role.title')}</h1>

      {readOnly && (
        <div role="alert" className="alert alert-warning mt-4 text-sm">
          <span>{t('iam.menu.readOnly')}</span>
        </div>
      )}

      {/* 左右两栏：左 2/3 角色表 + 分页；右 1/3 菜单树授权 */}
      <div className="mt-4 flex gap-4">
        {/* 左栏 */}
        <div className="w-2/3">
          <div className="bg-base-100 border-base-300 overflow-x-auto rounded-(--page-radius) border">
            <table className="table-sm table">
              <thead>
                <tr>
                  <th>{t('iam.role.colName')}</th>
                  <th>{t('iam.role.colCode')}</th>
                  <th>{t('iam.role.colPermCount')}</th>
                  {!readOnly && <th>{t('iam.role.colActions')}</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={readOnly ? 3 : 4}>
                      <div className="flex justify-center py-8">
                        <span className="loading loading-spinner loading-lg" />
                      </div>
                    </td>
                  </tr>
                ) : pageRoles.length === 0 ? (
                  <tr>
                    <td
                      colSpan={readOnly ? 3 : 4}
                      className="text-base-content/50 py-8 text-center"
                    >
                      {loadError || t('iam.role.empty')}
                    </td>
                  </tr>
                ) : (
                  pageRoles.map((role) => (
                    <tr
                      key={role.id}
                      className={`cursor-pointer ${
                        selectedRole?.id === role.id ? 'bg-base-200' : ''
                      }`}
                      onClick={() => void selectRole(role)}
                    >
                      <td className="font-medium">
                        {role.name}
                        {role.builtIn && (
                          <span className="badge badge-ghost badge-sm ml-1">
                            {t('iam.role.colBuiltIn')}
                          </span>
                        )}
                      </td>
                      <td className="font-mono text-xs">{role.code}</td>
                      <td>
                        <span className="badge badge-ghost badge-sm">
                          {role.permissionCount}
                        </span>
                      </td>
                      {!readOnly && (
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="btn btn-soft btn-primary btn-xs gap-1"
                              disabled={role.builtIn}
                              onClick={() => openForm(role)}
                            >
                              <svg
                                className="size-3.5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                aria-hidden="true"
                              >
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                              </svg>
                              {t('iam.role.edit')}
                            </button>
                            <button
                              type="button"
                              className="btn btn-soft btn-error btn-xs gap-1"
                              disabled={role.builtIn}
                              onClick={() => {
                                setDeleteError('');
                                setDeleteTarget(role);
                              }}
                            >
                              <svg
                                className="size-3.5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                aria-hidden="true"
                              >
                                <path d="M3 6h18" />
                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                              </svg>
                              {t('iam.role.delete')}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* 分页 */}
          {roles.length > PAGE_SIZE && (
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                {t('iam.role.prev')}
              </button>
              <span className="text-sm">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('iam.role.next')}
              </button>
            </div>
          )}
        </div>

        {/* 右栏：菜单树 checkbox */}
        <div className="w-1/3">
          <div className="bg-base-100 border-base-300 rounded-(--page-radius) border p-3">
            <div className="text-sm font-medium">{t('iam.role.treeTitle')}</div>
            <div className="mt-2 max-h-[28rem] overflow-y-auto">
              <RoleTree
                nodes={tree}
                depth={0}
                check={check.checked}
                onToggle={toggleNode}
                nodeState={nodeState}
              />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={!selectedRole || saving}
                onClick={revert}
              >
                {t('iam.role.revert')}
              </button>
              <button
                type="button"
                className="btn btn-sm rounded-(--page-radius) bg-(--page-primary) text-white hover:opacity-90"
                disabled={!selectedRole || saving}
                onClick={() => void save()}
              >
                {saving && (
                  <span className="loading loading-spinner loading-xs" />
                )}
                {t('iam.role.save')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 新建/编辑角色弹窗（编辑态 code 只读；内置角色行内按钮已禁用，此处兜底） */}
      {formOpen && (
        <dialog
          className="modal modal-open"
          onClick={(e) => e.target === e.currentTarget && setFormOpen(false)}
        >
          <div className="modal-box bg-base-100 max-w-100 rounded-(--page-radius)">
            <h3 className="text-lg font-semibold">
              {editing ? t('iam.role.editTitle') : t('iam.role.createTitle')}
            </h3>
            <div className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm">
                  <span className="text-error">*</span> {t('iam.role.colName')}
                </span>
                <input
                  type="text"
                  required
                  placeholder={t('iam.role.namePlaceholder')}
                  className="input input-sm bg-base-200 w-full"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </label>
              {!editing && (
                <label className="flex flex-col gap-1">
                  <span className="text-sm">
                    <span className="text-error">*</span>{' '}
                    {t('iam.role.colCode')}
                  </span>
                  <input
                    type="text"
                    required
                    placeholder={t('iam.role.codePlaceholder')}
                    className="input input-sm bg-base-200 w-full font-mono"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                  />
                </label>
              )}
              {editing?.builtIn && (
                <div role="alert" className="alert alert-warning text-sm">
                  <span>{'内置角色不允许编辑或删除'}</span>
                </div>
              )}
            </div>

            {formError && (
              <div role="alert" className="alert alert-error mt-3 text-sm">
                <span>{formError}</span>
              </div>
            )}

            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setFormOpen(false)}
              >
                {t('iam.menu.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-sm rounded-(--page-radius) bg-(--page-primary) text-white hover:opacity-90"
                disabled={saving}
                onClick={() => void submitForm()}
              >
                {saving && (
                  <span className="loading loading-spinner loading-xs" />
                )}
                {t('iam.role.save')}
              </button>
            </div>
          </div>
        </dialog>
      )}

      {/* 删除确认弹窗 */}
      {deleteTarget && (
        <dialog
          className="modal modal-open"
          onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}
        >
          <div className="modal-box bg-base-100 max-w-100 rounded-(--page-radius)">
            <h3 className="text-lg font-semibold">
              {t('iam.role.deleteTitle')}
            </h3>
            <p className="text-base-content/70 mt-3 text-sm">
              {t('iam.role.deleteConfirm', { name: deleteTarget.name })}
            </p>
            {deleteError && (
              <div role="alert" className="alert alert-error mt-3 text-sm">
                <span>{deleteError}</span>
              </div>
            )}
            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setDeleteTarget(null)}
              >
                {t('iam.menu.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-error btn-sm"
                disabled={saving}
                onClick={() => void submitDelete()}
              >
                {saving && (
                  <span className="loading loading-spinner loading-xs" />
                )}
                {t('iam.role.delete')}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}

/** 树渲染（递归）：checkbox 三态 + 缩进 + 展开/收起。 */
function RoleTree({
  nodes,
  depth,
  check,
  onToggle,
  nodeState,
}: {
  nodes: MenuItemRecord[];
  depth: number;
  check: Set<number>;
  onToggle: (node: MenuItemRecord, checked: boolean) => void;
  nodeState: (
    node: MenuItemRecord,
    checked: Set<number>,
  ) => 'checked' | 'indeterminate' | 'unchecked';
}) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  return (
    <>
      {nodes.map((node) => {
        const state = nodeState(node, check);
        const hasChildren = !!node.children?.length;
        const isCollapsed = collapsed.has(node.id);
        return (
          <div key={node.id}>
            <div
              className="flex items-center gap-2 py-0.5"
              style={{ paddingLeft: `${depth * 1.25}rem` }}
            >
              {hasChildren && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs px-1"
                  onClick={() =>
                    setCollapsed((prev) => {
                      const next = new Set(prev);
                      if (next.has(node.id)) next.delete(node.id);
                      else next.add(node.id);
                      return next;
                    })
                  }
                >
                  <svg
                    className={`size-3 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </button>
              )}
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs checkbox-primary"
                  checked={state === 'checked'}
                  ref={(el) => {
                    if (el) el.indeterminate = state === 'indeterminate';
                  }}
                  onChange={(e) => onToggle(node, e.target.checked)}
                />
                <span className="text-sm">{node.name}</span>
              </label>
            </div>
            {hasChildren && !isCollapsed && (
              <RoleTree
                nodes={node.children!}
                depth={depth + 1}
                check={check}
                onToggle={onToggle}
                nodeState={nodeState}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { getProps } from '../props';
import { rolesApi, type RoleRecord } from '../api/roles';
import { menusApi, type MenuItemRecord } from '../api/menus';
import { showToast } from '../utils/notify';

/*
 * 角色管理页（任务 11-06）——RBAC 角色界面。
 *
 * 布局：单栏角色表（名称/编码/授权数/操作）+ 分页；菜单授权不再是独立右栏，
 * 收进「新建/编辑角色」弹窗作为表单项（菜单权限树 checkbox，随表单一起提交：
 * 先建/改角色 → 再全量替换授权，两步提交）。
 *
 * 树勾选三态：checked（全选）/ indeterminate（部分）/ unchecked；勾选父节点级联
 * 全选子树。收集时只收勾选节点自身 permission（非空才入集合；空 permission 的
 * 公开节点可勾选联动子树但不产生授权项）。
 */

/** 平铺树（递归收集用）。 */
function flattenNodes(nodes: MenuItemRecord[]): MenuItemRecord[] {
  return nodes.flatMap((n) => [n, ...flattenNodes(n.children ?? [])]);
}

/** 收集子树全部节点 id（勾选父节点时级联）。 */
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [loadError, setLoadError] = useState('');
  // 角色新建/编辑弹窗（editing 非 null = 编辑态）；菜单授权树作为表单项
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RoleRecord | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [checked, setChecked] = useState<Set<number>>(new Set());
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
      // 403 → 后置只读（游客/无权限看不到管理界面）
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

  /** 勾选/取消节点 + 子树级联。 */
  const toggleNode = (node: MenuItemRecord, shouldCheck: boolean) => {
    setChecked((prev) => {
      const next = new Set(prev);
      for (const id of collectSubtreeIds(node)) {
        if (shouldCheck) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  /** 节点三态：自身 checked / 部分子选中 → indeterminate / 否则 unchecked。 */
  const nodeState = (
    node: MenuItemRecord,
    checkedIds: Set<number>,
  ): 'checked' | 'indeterminate' | 'unchecked' => {
    if (checkedIds.has(node.id)) return 'checked';
    const children = node.children ?? [];
    if (children.length === 0) return 'unchecked';
    const anyChecked = flattenNodes(children).some((c) => checkedIds.has(c.id));
    return anyChecked ? 'indeterminate' : 'unchecked';
  };

  /** 打开新建/编辑弹窗（编辑态拉既有授权集合回显勾选）。 */
  const openForm = async (role?: RoleRecord) => {
    setFormError('');
    setEditing(role ?? null);
    setFormName(role?.name ?? '');
    setFormCode(role?.code ?? '');
    setChecked(new Set());
    setFormOpen(true);
    if (role) {
      try {
        const perms = await rolesApi.getPermissions(role.id);
        const permSet = new Set(perms);
        // 授权集合（permission 字符串）→ 勾选的节点 id（permission 命中的节点勾选）
        setChecked(
          new Set(
            flattenNodes(tree)
              .filter((n) => n.permission && permSet.has(n.permission))
              .map((n) => n.id),
          ),
        );
      } catch (e) {
        const msg =
          e instanceof Error && e.message
            ? e.message
            : t('iam.role.loadFailed');
        if (/401|403|登录|权限/i.test(msg)) setReadOnly(true);
        showToast(msg);
      }
    }
  };

  /** 提交新建/编辑：先建/改角色 → 有勾选变化时全量替换授权（两步提交）。 */
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
      // 勾选节点 → 收集其 permission（空 permission 的公开节点不产生授权项）
      const perms = flattenNodes(tree)
        .filter((n) => checked.has(n.id) && n.permission)
        .map((n) => n.permission!);

      let role: RoleRecord;
      if (editing) {
        role = await rolesApi.update(editing.id, name);
      } else {
        role = await rolesApi.create(formCode.trim(), name);
      }
      // 授权随表单提交：新建（要授权）或编辑（全量替换语义，空集合 = 清空授权）
      if (!editing || perms.length > 0 || checked.size > 0) {
        await rolesApi.savePermissions(role.id, perms);
      }
      setFormOpen(false);
      showToast(t('iam.role.saved'), 'success');
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

  /** 提交删除（内置角色服务端 1019 拒绝）。 */
  const submitDelete = async () => {
    if (!deleteTarget || saving) return;
    setSaving(true);
    setDeleteError('');
    try {
      await rolesApi.remove(deleteTarget.id);
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
      className="text-base-content min-h-full p-6"
    >
      {/* 工具栏：标题 + 新建角色 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('iam.role.title')}</h1>
        {!readOnly && (
          <button
            type="button"
            className="btn btn-soft btn-primary btn-sm gap-1"
            onClick={() => void openForm()}
          >
            <svg
              className="size-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t('iam.role.create')}
          </button>
        )}
      </div>

      {readOnly && (
        <div role="alert" className="alert alert-warning mt-4 text-sm">
          <span>{t('iam.menu.readOnly')}</span>
        </div>
      )}

      {/* 角色表（单栏；授权在弹窗表单里） */}
      <div className="bg-base-100 border-base-300 mt-4 overflow-x-auto rounded-(--page-radius) border">
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
                <tr key={role.id}>
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
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="btn btn-soft btn-primary btn-xs gap-1"
                          disabled={role.builtIn}
                          onClick={() => void openForm(role)}
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

      {/* 新建/编辑角色弹窗：名称/编码 + 菜单授权树（表单项，随保存一起提交） */}
      {formOpen && (
        <dialog
          className="modal modal-open"
          onClick={(e) => e.target === e.currentTarget && setFormOpen(false)}
        >
          <div className="modal-box bg-base-100 max-w-120 rounded-(--page-radius)">
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

              {/* 菜单授权树（表单项）：三态 checkbox + 缩进 + 级联 */}
              <div className="flex flex-col gap-1">
                <span className="text-sm">{t('iam.role.treeTitle')}</span>
                <div className="bg-base-200/50 max-h-72 overflow-y-auto rounded-(--page-radius) p-2">
                  <RoleTree
                    nodes={tree}
                    depth={0}
                    check={checked}
                    onToggle={toggleNode}
                    nodeState={nodeState}
                  />
                </div>
              </div>
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
    <ul className="flex flex-col gap-0.5">
      {nodes.map((node) => {
        const state = nodeState(node, check);
        const hasChildren = !!node.children?.length;
        const isCollapsed = collapsed.has(node.id);
        return (
          <li key={node.id}>
            <div
              className="flex items-center gap-1"
              style={{ paddingLeft: `${depth * 1.25}rem` }}
            >
              {/* 展开钮占位：叶子节点用等宽空位撑齐，保证 checkbox 列垂直对齐 */}
              {hasChildren ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-square btn-xs size-4 min-h-0 p-0"
                  aria-label={isCollapsed ? 'expand' : 'collapse'}
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
              ) : (
                <span className="inline-block size-4 shrink-0" />
              )}
              <label className="flex cursor-pointer items-center gap-2 py-0.5">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs checkbox-primary rounded-[4px]"
                  checked={state === 'checked'}
                  ref={(el) => {
                    if (el) el.indeterminate = state === 'indeterminate';
                  }}
                  onChange={(e) => onToggle(node, e.target.checked)}
                />
                <span className="text-sm leading-none">{node.name}</span>
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
          </li>
        );
      })}
    </ul>
  );
}

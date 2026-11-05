import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { getProps } from '../props';
import { usersApi, type UserRecord } from '../api/users';
import { showToast } from '../utils/notify';

/*
 * 用户管理页（任务 11-05-iam-user-management）——iam 第二业务域。
 *
 * - 平表 + 行内操作（角色分配弹窗 / 禁用切换）；无动态类型联动（用户无类型语义）。
 * - 数据流：mount 拉 usersApi.list() → 表格；写操作成功后重拉（与菜单页同款）。
 * - toast 只提示一次：集成态宿主拦截器已管 403/5xx/网络错（写操作 403 → 只读后置），
 *   本页 catch 只对拦截器静默放行的错误补弹——与菜单页同款按通道判定。
 * - preferences 消费与 LoginPage/菜单页同模式：props 字段优先 → 内置中性缺省。
 */

export function UserManagementPage() {
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

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [readOnly, setReadOnly] = useState(false);
  /** 角色编辑弹窗目标（null = 关闭）；editing = 勾选中的角色集合 */
  const [editTarget, setEditTarget] = useState<UserRecord | null>(null);
  const [editingRoles, setEditingRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setUsers(await usersApi.list());
    } catch (e) {
      const msg =
        e instanceof Error && e.message ? e.message : t('iam.user.loadFailed');
      setLoadError(msg);
      // 集成态 403/5xx/网络错已由宿主拦截器 notify；404 等静默放行状态本页补弹
      const status = (e as { response?: { status?: number } })?.response
        ?.status;
      const integration = typeof getProps().onNotify === 'function';
      const handledByHostInterceptor =
        status === 403 ||
        (status !== undefined && status >= 500) ||
        status === undefined;
      showToast(msg, 'error', integration ? !handledByHostInterceptor : true);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** 提交角色分配；成功关弹窗 + 重拉。 */
  const submitRoles = async () => {
    if (!editTarget || saving) return;
    if (!editingRoles.length) {
      setFormError(t('iam.user.rolesRequired'));
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await usersApi.assignRoles(editTarget.id, editingRoles);
      setEditTarget(null);
      await reload();
    } catch (e) {
      const msg =
        e instanceof Error && e.message ? e.message : t('iam.user.saveFailed');
      if (/401|403|登录|权限/i.test(msg)) setReadOnly(true);
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  /** 禁用/恢复（自禁由后端 1015 拦——前端按当前用户 email 兜底置灰）。
   *  当前用户身份：mock = Bearer mock-admin 对应的 admin@example.com；
   *  集成态 = props.token 对应的 JWT sub（前端无 email 可比——依赖后端 1015 兜底）。 */
  const toggleBan = async (user: UserRecord, disabled: boolean) => {
    if (saving) return;
    setSaving(true);
    try {
      await usersApi.setBanned(user.id, disabled);
      await reload();
    } catch (e) {
      const msg =
        e instanceof Error && e.message ? e.message : t('iam.user.saveFailed');
      showToast(msg);
    } finally {
      setSaving(false);
    }
  };

  const isBanned = (u: UserRecord) => !!u.banned_until;

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
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('iam.user.title')}</h1>
      </div>

      {readOnly && (
        <div role="alert" className="alert alert-warning mb-4 text-sm">
          <span>{t('iam.menu.readOnly')}</span>
        </div>
      )}

      {/* 用户表格（无 loadError 内联——同菜单页 toast 化 + 空态文案） */}
      <div className="bg-base-100 border-base-300 overflow-x-auto rounded-(--page-radius) border">
        <table className="table-sm table">
          <thead>
            <tr>
              <th>{t('iam.user.colEmail')}</th>
              <th>{t('iam.user.colRoles')}</th>
              <th>{t('iam.user.colStatus')}</th>
              <th>{t('iam.user.colCreatedAt')}</th>
              <th>{t('iam.user.colLastSignIn')}</th>
              {!readOnly && <th>{t('iam.user.colActions')}</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={readOnly ? 5 : 6}>
                  <div className="flex justify-center py-8">
                    <span className="loading loading-spinner loading-lg" />
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={readOnly ? 5 : 6}
                  className="text-base-content/50 py-8 text-center"
                >
                  {loadError || t('iam.user.empty')}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td className="font-medium">{user.email ?? '—'}</td>
                  <td>
                    <div className="flex gap-1">
                      {user.roles.length ? (
                        user.roles.map((role) => (
                          <span
                            key={role}
                            className={`badge badge-outline badge-sm ${
                              role === 'admin' ? 'badge-primary' : ''
                            }`}
                          >
                            {t(`iam.user.role_${role}`)}
                          </span>
                        ))
                      ) : (
                        <span className="text-base-content/50">—</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {isBanned(user) ? (
                      <span className="badge badge-error badge-sm">
                        {t('iam.user.banned')}
                      </span>
                    ) : (
                      <span className="badge badge-success badge-sm">
                        {t('iam.user.active')}
                      </span>
                    )}
                  </td>
                  <td className="text-xs">
                    {new Date(user.created_at).toLocaleString()}
                  </td>
                  <td className="text-xs">
                    {user.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleString()
                      : '—'}
                  </td>
                  {!readOnly && (
                    <td>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => {
                            setFormError('');
                            setEditTarget(user);
                            setEditingRoles(user.roles);
                          }}
                        >
                          {t('iam.user.assignRoles')}
                        </button>
                        {isBanned(user) ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            disabled={saving}
                            onClick={() => void toggleBan(user, false)}
                          >
                            {t('iam.user.enable')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs text-error"
                            disabled={saving}
                            onClick={() => void toggleBan(user, true)}
                          >
                            {t('iam.user.disable')}
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 角色编辑弹窗（admin/guest toggle；至少保留一角色） */}
      {editTarget && (
        <dialog
          className="modal modal-open"
          onClick={(e) => e.target === e.currentTarget && setEditTarget(null)}
        >
          <div className="modal-box bg-base-100 max-w-100 rounded-(--page-radius)">
            <h3 className="text-lg font-semibold">
              {t('iam.user.rolesTitle')}
              <span className="text-base-content/60 ml-2 text-sm">
                {editTarget.email}
              </span>
            </h3>
            <div className="mt-4 flex flex-col gap-2">
              {(['admin', 'guest'] as const).map((role) => (
                <label key={role} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="toggle toggle-sm"
                    checked={editingRoles.includes(role)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setEditingRoles((prev) => {
                        const next = checked
                          ? [...new Set([...prev, role])]
                          : prev.filter((r) => r !== role);
                        // 至少保留一角色（全摘会让用户失去所有权限且触发器不再补）
                        return next.length ? next : prev;
                      });
                    }}
                  />
                  <span className="text-sm">{t(`iam.user.role_${role}`)}</span>
                </label>
              ))}
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
                onClick={() => setEditTarget(null)}
              >
                {t('iam.menu.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-sm rounded-(--page-radius) bg-(--page-primary) text-white hover:opacity-90"
                disabled={saving}
                onClick={() => void submitRoles()}
              >
                {saving && (
                  <span className="loading loading-spinner loading-xs" />
                )}
                {t('iam.menu.save')}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}

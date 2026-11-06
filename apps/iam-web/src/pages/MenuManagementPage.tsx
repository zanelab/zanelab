import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react';
import { useTranslation } from 'react-i18next';
import { getProps } from '../props';
import { showToast } from '../utils/notify';
import { menusApi, type MenuItemRecord, type MenuInput } from '../api/menus';
import { buildTree, countWithDescendants } from '../utils/menu-tree';
import { Permission } from '../components/Permission';

/*
 * 菜单管理页 —— iam 首个业务域（任务 11-03，design DD5）。
 *
 * - 数据流：mount 拉 menusApi.list() → buildTree → 树形表格；CRUD 成功后**重拉**
 *   （树形 + 级联删除下乐观更新复杂度不值当，design 已定）。
 * - 权限：写操作被 403/401 后置为只读（readOnly state），不再重试；游客/未登录
 *   首屏只见可见子集（服务端 DD3 判定），操作列隐藏。
 * - 树形渲染：手写缩进行（daisyUI 无 tree 组件）；展开/收起 state 按节点 id。
 * - preferences 消费与 LoginPage 同模式：props 字段优先 → 内置中性缺省兜底，
 *   根 div 内联 CSS 变量，不改宿主 daisyUI 主题。
 * - 样式：daisyUI table / modal / select / toggle / validator，类名语义见
 *   .claude/skills/daisyui 组件指南。
 */

/** 编辑表单的可写字段（表单受控 state 的形状；任务 11-04 动态表单）。 */
interface MenuFormState {
  id: number | null; // null = 新建
  pid: number | null;
  permission: string; // 语义权限码（system:menu:list；空=公开）
  name: string;
  component: string; // 组件名称（app/menu 类型动态显示）
  uri: string;
  type: MenuItemRecord['type'];
  sort: string; // input number 的字符串形态，提交时转数字
  icon: string;
  activeIcon: string;
  hidden: boolean;
  scopes: ('A' | 'C')[]; // 适用范围多选
}

const EMPTY_FORM: MenuFormState = {
  id: null,
  pid: null,
  permission: '',
  name: '',
  component: '',
  uri: '',
  type: 'app', // 用户指定默认应用
  sort: '0',
  icon: '',
  activeIcon: '',
  hidden: false,
  scopes: ['C'],
};

/**
 * 类型联动矩阵（与 Edge Fn TYPE_FIELD_MATRIX 同语义；用户提示词 F3）：
 * uri 必填性、component/icon 可见性、是否必选父级。
 */
const TYPE_MATRIX: Record<
  MenuItemRecord['type'],
  {
    uri: 'required' | 'hidden';
    component: boolean;
    icon: boolean;
    needsPid: boolean;
  }
> = {
  app: { uri: 'required', component: true, icon: true, needsPid: false },
  group: { uri: 'hidden', component: false, icon: false, needsPid: true },
  menu: { uri: 'required', component: true, icon: true, needsPid: true },
  button: { uri: 'hidden', component: false, icon: false, needsPid: true },
};

export function MenuManagementPage() {
  const { t } = useTranslation();
  const props = getProps();

  // preferences 派生（与 LoginPage 同款：props 字段优先 + 中性缺省）
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

  const [flat, setFlat] = useState<MenuItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [readOnly, setReadOnly] = useState(false); // 403/401 后置为只读
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // 弹窗：'create' | 'edit' | 'delete:<id>' | null
  const [form, setForm] = useState<MenuFormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuItemRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // 递归平铺：服务端返回 children 嵌套形状，管理页的 buildTree 消费平铺行
  // （模块级纯函数——无 state 依赖，放组件外亦可，就近可读性优先）
  const flattenRow = (node: MenuItemRecord): MenuItemRecord[] => [
    node,
    ...(node.children ?? []).flatMap(flattenRow),
  ];

  /** 重拉列表（CRUD 后的唯一刷新路径）。 */
  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const rows = await menusApi.list();
      setFlat(rows.flatMap((n) => flattenRow(n)));
    } catch (e) {
      // toast 只提示一次（防双弹）：集成态走宿主 props.http，其拦截器链已对
      // 401/403/5xx/网络错/envelope 业务失败统一 notify（spec「错误处理走拦截器」）
      // ——这些本页不再弹；其余状态（404/400 等拦截器静默放行的）由本页补弹。
      // 独立态走本地 client（无 notify 拦截器），本页弹即唯一一次。
      const msg =
        e instanceof Error && e.message ? e.message : t('iam.menu.loadFailed');
      setLoadError(msg);
      if (/401|403|登录|权限/i.test(msg)) setReadOnly(true);
      const status = (e as { response?: { status?: number }; status?: number })
        ?.response?.status;
      const integration = typeof getProps().onNotify === 'function';
      const handledByHostInterceptor =
        status === 401 ||
        status === 403 ||
        (status !== undefined && status >= 500) ||
        status === undefined; // 无 status = 网络错/envelope 业务失败（宿主链已 notify）
      const shouldToast = integration ? !handledByHostInterceptor : true;
      showToast(msg, 'error', shouldToast);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const tree = useMemo(() => buildTree(flat), [flat]);

  const toggleExpand = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /** 打开新增弹窗（可带父级预选）。 */
  const openCreate = (pid: number | null) => {
    setFormError('');
    setForm({ ...EMPTY_FORM, pid });
  };

  /** 打开编辑弹窗（表单回填行数据）。 */
  const openEdit = (row: MenuItemRecord) => {
    setFormError('');
    setForm({
      id: row.id,
      pid: row.pid,
      permission: row.permission ?? '',
      name: row.name,
      component: row.component ?? '',
      uri: row.uri ?? '',
      type: row.type,
      sort: String(row.sort),
      icon: row.icon ?? '',
      activeIcon: row.activeIcon ?? '',
      hidden: row.hidden,
      scopes: row.scopes.length ? row.scopes : ['C'],
    });
  };

  /** 切换菜单类型：按矩阵清空失效字段（防脏数据提交，design 决策）。 */
  const changeType = (type: MenuItemRecord['type']) => {
    if (!form) return;
    const matrix = TYPE_MATRIX[type];
    setForm({
      ...form,
      type,
      uri: matrix.uri === 'hidden' ? '' : form.uri,
      component: matrix.component ? form.component : '',
      icon: matrix.icon ? form.icon : '',
      activeIcon: matrix.icon ? form.activeIcon : '',
    });
  };

  /** 切换 scopes 多选（A/C chip，至少一项——提交时校验）。 */
  const toggleScope = (scope: 'A' | 'C') => {
    if (!form) return;
    const has = form.scopes.includes(scope);
    const next = has
      ? form.scopes.filter((s) => s !== scope)
      : [...form.scopes, scope];
    setForm({ ...form, scopes: next });
  };

  /** 提交新增/编辑；先过类型矩阵即时校验，成功关弹窗 + 重拉。 */
  const submitForm = async () => {
    if (!form || saving) return;
    const matrix = TYPE_MATRIX[form.type];
    if (!form.name.trim()) {
      setFormError(t('iam.menu.nameRequired'));
      return;
    }
    if (form.scopes.length === 0) {
      setFormError(t('iam.menu.scopesRequired'));
      return;
    }
    if (matrix.uri === 'required' && !form.uri.trim()) {
      setFormError(t('iam.menu.uriRequired'));
      return;
    }
    if (matrix.needsPid && form.pid == null) {
      setFormError(t('iam.menu.parentRequired'));
      return;
    }
    setSaving(true);
    setFormError('');
    const input: MenuInput = {
      pid: form.pid,
      permission: form.permission.trim() || null,
      name: form.name.trim(),
      uri: matrix.uri === 'hidden' ? null : form.uri.trim() || null,
      type: form.type,
      sort: Number(form.sort) || 0,
      icon: matrix.icon ? form.icon.trim() || null : null,
      activeIcon: matrix.icon ? form.activeIcon.trim() || null : null,
      component: matrix.component ? form.component || null : null,
      hidden: form.hidden,
      scopes: form.scopes,
    };
    try {
      if (form.id != null) {
        await menusApi.update(form.id, input);
      } else {
        await menusApi.create(input);
      }
      setForm(null);
      await reload();
    } catch (e) {
      // 401/403 → 后置只读（token 过期/无权限），其余错误留在弹窗内展示
      const msg =
        e instanceof Error && e.message ? e.message : t('iam.menu.saveFailed');
      const unauthorized = /401|403|登录|权限/i.test(msg);
      if (unauthorized) {
        setReadOnly(true);
        setForm(null);
      }
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  /** 提交删除（级联警告在确认弹窗里展示数量）；成功关弹窗 + 重拉。 */
  const submitDelete = async () => {
    if (!deleteTarget || saving) return;
    setSaving(true);
    setDeleteError('');
    try {
      await menusApi.remove(deleteTarget.id);
      setDeleteTarget(null);
      await reload();
    } catch (e) {
      const msg =
        e instanceof Error && e.message
          ? e.message
          : t('iam.menu.deleteFailed');
      if (/401|403|登录|权限/i.test(msg)) setReadOnly(true);
      setDeleteError(msg);
    } finally {
      setSaving(false);
    }
  };

  /** 树行渲染（缩进 = 深度 * 1.5rem；children 非空才显示展开箭头）。 */
  const renderRows = (
    nodes: MenuItemRecord[],
    depth: number,
  ): React.ReactNode[] =>
    nodes.flatMap((node) => {
      const hasChildren = !!node.children?.length;
      const isOpen = expanded.has(node.id);
      const rows: React.ReactNode[] = [
        <tr key={node.id}>
          <td>
            <div
              className="flex items-center gap-2"
              style={{ paddingLeft: `${depth * 1.5}rem` }}
            >
              {hasChildren ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs px-1"
                  aria-label={
                    isOpen ? t('iam.menu.collapse') : t('iam.menu.expand')
                  }
                  onClick={() => toggleExpand(node.id)}
                >
                  <svg
                    className={`size-3 transition-transform ${isOpen ? 'rotate-90' : ''}`}
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
                <span className="inline-block size-3" />
              )}
              <span className="font-medium">{node.name}</span>
              {node.hidden && (
                <span className="badge badge-ghost badge-sm">
                  {t('iam.menu.hidden')}
                </span>
              )}
            </div>
          </td>
          {/* 图标列：默认 icon；hover 有 activeIcon 时切换展示 */}
          <td>
            {node.icon ? (
              <span
                className="group/ic inline-flex cursor-help items-center"
                title={
                  node.activeIcon
                    ? `${node.icon} → ${node.activeIcon}`
                    : node.icon
                }
              >
                <span className="badge badge-ghost badge-sm font-mono normal-case group-hover/ic:hidden">
                  {node.icon}
                </span>
                {node.activeIcon && (
                  <span className="badge badge-secondary badge-sm hidden font-mono normal-case group-hover/ic:inline-flex">
                    {node.activeIcon}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-base-content/30">—</span>
            )}
          </td>
          <td className="text-xs">{node.uri ?? '—'}</td>
          <td>
            <span className="badge badge-outline badge-sm">{node.type}</span>
          </td>
          <td className="text-xs">{node.sort}</td>
          {!readOnly && (
            <td className="w-60">
              <div className="flex items-center justify-start gap-1">
                <Permission code="system:menu:create">
                  <button
                    type="button"
                    className="btn btn-soft btn-info btn-xs gap-1"
                    onClick={() => openCreate(node.id)}
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
                    {t('iam.menu.addChild')}
                  </button>
                </Permission>
                <Permission code="system:menu:update">
                  <button
                    type="button"
                    className="btn btn-soft btn-primary btn-xs gap-1"
                    onClick={() => openEdit(node)}
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
                    {t('iam.menu.edit')}
                  </button>
                </Permission>
                <Permission code="system:menu:delete">
                  <button
                    type="button"
                    className="btn btn-soft btn-error btn-xs gap-1"
                    onClick={() => {
                      setDeleteError('');
                      setDeleteTarget(node);
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
                    {t('iam.menu.delete')}
                  </button>
                </Permission>
              </div>
            </td>
          )}
        </tr>,
      ];
      if (hasChildren && isOpen)
        rows.push(...renderRows(node.children!, depth + 1));
      return rows;
    });

  // 弹窗父级候选：平铺行里除自身及后代外的全部节点（防把自己挂到自己子树）
  const parentCandidates = form
    ? form.id == null
      ? flat
      : flat.filter((row) => row.id !== form.id)
    : [];

  return (
    // 页面根 div 内联 CSS 变量（与 LoginPage 同模式；独立态自持，集成态由宿主注入值）
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
      {/* 工具栏：标题 + 新增根级 */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('iam.menu.title')}</h1>
        {!readOnly && (
          <Permission code="system:menu:create">
            <button
              type="button"
              className="btn btn-sm gap-2 rounded-(--page-radius) bg-(--page-primary) text-white hover:opacity-90"
              onClick={() => openCreate(null)}
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              {t('iam.menu.create')}
            </button>
          </Permission>
        )}
      </div>

      {readOnly && (
        <div role="alert" className="alert alert-warning mb-4 text-sm">
          <span>{t('iam.menu.readOnly')}</span>
        </div>
      )}

      {/* 加载失败不再内联渲染——reload 的 catch 已 showToast（集成态上抛宿主）；
          表格区以空态文案呈现失败结果（loadError 置位） */}

      {/* 树形表格（daisyUI table；列随 readOnly 收缩） */}
      <div className="bg-base-100 border-base-300 overflow-x-auto rounded-(--page-radius) border">
        <table className="table-sm table">
          <thead>
            <tr>
              <th>{t('iam.menu.colName')}</th>
              <th>{t('iam.menu.colIcon')}</th>
              <th>{t('iam.menu.colUri')}</th>
              <th>{t('iam.menu.colType')}</th>
              <th>{t('iam.menu.colSort')}</th>
              {!readOnly && (
                <th className="w-60">{t('iam.menu.colActions')}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={readOnly ? 6 : 7}>
                  <div className="flex justify-center py-8">
                    <span className="loading loading-spinner loading-lg" />
                  </div>
                </td>
              </tr>
            ) : tree.length === 0 ? (
              <tr>
                <td
                  colSpan={readOnly ? 6 : 7}
                  className="text-base-content/50 py-8 text-center"
                >
                  {loadError || t('iam.menu.empty')}
                </td>
              </tr>
            ) : (
              renderRows(tree, 0)
            )}
          </tbody>
        </table>
      </div>

      {/* 新增/编辑弹窗 */}
      {form && (
        <dialog
          className="modal modal-open"
          onClick={(e) => e.target === e.currentTarget && setForm(null)}
        >
          <div className="modal-box bg-base-100 max-w-120 rounded-(--page-radius)">
            <h3 className="text-lg font-semibold">
              {form.id != null
                ? t('iam.menu.editTitle')
                : t('iam.menu.createTitle')}
            </h3>
            <div className="mt-4 flex flex-col gap-3">
              {/* 菜单类型（全局固定，默认应用；切换即清失效字段——changeType） */}
              <label className="flex flex-col gap-1">
                <span className="text-sm">
                  <span className="text-error">*</span> {t('iam.menu.colType')}
                </span>
                <select
                  className="select select-sm bg-base-200 w-full"
                  value={form.type}
                  onChange={(e) =>
                    changeType(e.target.value as MenuFormState['type'])
                  }
                >
                  <option value="app">{t('iam.menu.typeApp')}</option>
                  <option value="group">{t('iam.menu.typeGroup')}</option>
                  <option value="menu">{t('iam.menu.typeMenu')}</option>
                  <option value="button">{t('iam.menu.typeButton')}</option>
                </select>
              </label>

              {/* 父级菜单（分组/菜单/按钮必填；应用可为根——矩阵 needsPid） */}
              {TYPE_MATRIX[form.type].needsPid && (
                <label className="flex flex-col gap-1">
                  <span className="text-sm">
                    <span className="text-error">*</span> {t('iam.menu.parent')}
                  </span>
                  <select
                    className="select select-sm bg-base-200 w-full"
                    value={form.pid ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        pid:
                          e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                  >
                    <option value="">{t('iam.menu.selectParent')}</option>
                    {parentCandidates.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {/* 菜单名称（全局固定，必填） */}
              <label className="flex flex-col gap-1">
                <span className="text-sm">
                  <span className="text-error">*</span> {t('iam.menu.colName')}
                </span>
                <input
                  type="text"
                  required
                  placeholder={t('iam.menu.namePlaceholder')}
                  className="input input-sm validator bg-base-200 w-full"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <p className="validator-hint">
                  {t('iam.menu.nameCodeRequired')}
                </p>
              </label>

              {/* 适用范围（全局固定，多选必填 A/C；任务 11-04 新语义） */}
              <div className="flex flex-col gap-1">
                <span className="text-sm">
                  <span className="text-error">*</span> {t('iam.menu.scopes')}
                </span>
                <div className="flex gap-2">
                  {(['A', 'C'] as const).map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      className={`btn btn-sm rounded-(--page-radius) ${
                        form.scopes.includes(scope)
                          ? 'bg-(--page-primary) text-white hover:opacity-90'
                          : 'bg-base-200 text-base-content hover:bg-base-300'
                      }`}
                      aria-pressed={form.scopes.includes(scope)}
                      onClick={() => toggleScope(scope)}
                    >
                      {scope === 'A'
                        ? t('iam.menu.scopeAdmin')
                        : t('iam.menu.scopeClient')}
                    </button>
                  ))}
                </div>
              </div>

              {/* 排序编号（全局固定，必填） */}
              <label className="flex flex-col gap-1">
                <span className="text-sm">
                  <span className="text-error">*</span> {t('iam.menu.colSort')}
                </span>
                <input
                  type="number"
                  placeholder={t('iam.menu.sortPlaceholder')}
                  className="input input-sm bg-base-200 w-full"
                  value={form.sort}
                  onChange={(e) => setForm({ ...form, sort: e.target.value })}
                />
              </label>

              {/* 动态字段：应用/菜单才有组件名称与图标（矩阵 component/icon） */}
              {TYPE_MATRIX[form.type].component && (
                <label className="flex flex-col gap-1">
                  <span className="text-sm">{t('iam.menu.colComponent')}</span>
                  <input
                    type="text"
                    placeholder={t('iam.menu.componentPlaceholder')}
                    className="input input-sm bg-base-200 w-full font-mono"
                    value={form.component}
                    onChange={(e) =>
                      setForm({ ...form, component: e.target.value })
                    }
                  />
                </label>
              )}
              {TYPE_MATRIX[form.type].uri !== 'hidden' && (
                <label className="flex flex-col gap-1">
                  <span className="text-sm">
                    {TYPE_MATRIX[form.type].uri === 'required' && (
                      <span className="text-error">*</span>
                    )}{' '}
                    {t('iam.menu.colUri')}
                  </span>
                  <input
                    type="text"
                    placeholder={t('iam.menu.uriPlaceholder')}
                    className="input input-sm bg-base-200 w-full font-mono"
                    value={form.uri}
                    onChange={(e) => setForm({ ...form, uri: e.target.value })}
                  />
                </label>
              )}
              {/* 权限码（进入/操作权限，选填，空=公开）——button 节点即操作权限码 */}
              <label className="flex flex-col gap-1">
                <span className="text-sm">{t('iam.menu.colPermission')}</span>
                <input
                  type="text"
                  placeholder={t('iam.menu.permissionPlaceholder')}
                  className="input input-sm bg-base-200 w-full font-mono"
                  value={form.permission}
                  onChange={(e) =>
                    setForm({ ...form, permission: e.target.value })
                  }
                />
              </label>
              {TYPE_MATRIX[form.type].icon && (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm">{t('iam.menu.colIcon')}</span>
                    <input
                      type="text"
                      placeholder={t('iam.menu.iconPlaceholder')}
                      className="input input-sm bg-base-200 w-full font-mono"
                      value={form.icon}
                      onChange={(e) =>
                        setForm({ ...form, icon: e.target.value })
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm">
                      {t('iam.menu.colActiveIcon')}
                    </span>
                    <input
                      type="text"
                      placeholder={t('iam.menu.activeIconPlaceholder')}
                      className="input input-sm bg-base-200 w-full font-mono"
                      value={form.activeIcon}
                      onChange={(e) =>
                        setForm({ ...form, activeIcon: e.target.value })
                      }
                    />
                  </label>
                </>
              )}

              {/* 隐藏开关（全局固定；任务 11-04 回归表单） */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="toggle toggle-sm"
                  checked={form.hidden}
                  onChange={(e) =>
                    setForm({ ...form, hidden: e.target.checked })
                  }
                />
                <span className="text-sm">{t('iam.menu.hidden')}</span>
              </label>
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
                onClick={() => setForm(null)}
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
                {t('iam.menu.save')}
              </button>
            </div>
          </div>
        </dialog>
      )}

      {/* 删除确认弹窗（级联数量警告） */}
      {deleteTarget && (
        <dialog
          className="modal modal-open"
          onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}
        >
          <div className="modal-box bg-base-100 max-w-100 rounded-(--page-radius)">
            <h3 className="text-lg font-semibold">
              {t('iam.menu.deleteTitle')}
            </h3>
            <p className="text-base-content/70 mt-3 text-sm">
              {t('iam.menu.deleteConfirm', {
                name: deleteTarget.name,
                n: countWithDescendants(flat, deleteTarget.id) - 1,
              })}
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
                {t('iam.menu.delete')}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}

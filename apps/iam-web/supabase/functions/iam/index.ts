// iam: Edge Function — email OTP 两步登录 + 菜单管理
//
// 端点：
//   POST   /auth/otp/send   { email }       → { code: 0, data: { success: true } }
//   POST   /auth/otp/verify { email, code }   → { code: 0, data: { token, refreshToken, user } }
//   GET    /auth/menus      （匿名可调）      → 游客可见子集；有效 JWT → 按权限过滤的菜单树
//   POST   /menus           { ...菜单字段 }   → 新建（system:menu:create）
//   PUT    /menus/:id       { ...菜单字段 }   → 更新（system:menu:update）
//   DELETE /menus/:id                         → 删除（级联子树，system:menu:delete）
//   GET/PUT /auth/roles[ /:id/permissions ]    → 角色/授权（system:role:list / system:role:assign）
//   GET/PUT /auth/users[ /:id/roles | /:id/ban ] → 用户（system:user:list / assign / ban）
//
// 鉴权（任务 11-06 RBAC）：requirePermission(perm) 只校验权限码不校验角色——
// admin 即角色默认持 '*' 通配。无 JWT → 1010/401；无该权限码 → 1011/403。
// 菜单 GET 匿名不拒绝：无/无效 JWT 时返回游客可见子集（scopes 含 C）。
//
// 语言：前端通过 Accept-Language header 传 locale（zh-CN / en-US），缺省 zh-CN。
// envelope { code, data, msg } 对齐 portal http.ts 解包；code 0 = 成功。
// jsr: 导入由 Deno 运行时解析；本地 tsc（校验用）解析不了 jsr 前缀，前置 expect-error。
// 修改本文件后以 `tsc -p supabase/functions/tsconfig.json` 做类型检查（不含 jsr 模块内部）。
// @ts-expect-error jsr module — resolved by Deno runtime
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

// Deno 全局（edge-runtime.d.ts 在 Deno 运行时提供；本地 tsc 解析不了 jsr 导入，自补）
declare const Deno: { env: { get(key: string): string | undefined } };
// @ts-expect-error jsr module — resolved by Deno runtime
import { withSupabase } from 'jsr:@supabase/server@^1';

// @ts-expect-error jsr module — resolved by Deno runtime
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

// ==================== i18n ====================

const t: Record<string, Record<string, string>> = {
  'zh-CN': {
    ok: 'ok',
    notFound: '未找到',
    invalidBody: '请求格式错误',
    emailRequired: '邮箱不能为空',
    codeRequired: '邮箱和验证码不能为空',
    codeInvalid: '验证码错误或已过期',
    internalError: '服务器内部错误',
    unauthorized: '请先登录',
    forbidden: '没有执行此操作的权限',
    menuNotFound: '菜单不存在',
    typeMismatch: '字段与所选菜单类型不匹配（缺少必填项或值无效）',
    selfBan: '不能禁用当前登录的账号',
    invalidRoles: '角色编码无效',
    refreshInvalid: '登录已过期，请重新登录',
    refreshRequired: 'refreshToken 不能为空',
    rolesRequired: '请至少勾选一个授权菜单',
  },
  'en-US': {
    ok: 'ok',
    notFound: 'Not found',
    invalidBody: 'Invalid request body',
    emailRequired: 'Email is required',
    codeRequired: 'Email and code are required',
    codeInvalid: 'Verification code is invalid or expired',
    internalError: 'Internal server error',
    unauthorized: 'Please sign in first',
    forbidden: 'You do not have permission to perform this action',
    menuNotFound: 'Menu not found',
    typeMismatch:
      'Fields do not match the selected menu type (missing required or invalid)',
  },
};

function msg(lang: string, key: string): string {
  return t[lang]?.[key] ?? t['zh-CN'][key] ?? key;
}

function detectLang(req: Request): string {
  const h = req.headers.get('accept-language') ?? '';
  return /zh/i.test(h) ? 'zh-CN' : 'en-US';
}

// ==================== 响应工具 ====================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, accept-language',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json<T>(
  lang: string,
  data: T,
  key = 'ok',
  code = 0,
  status = 200,
): Response {
  return new Response(JSON.stringify({ code, data, msg: msg(lang, key) }), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}

function error(
  lang: string,
  code: number,
  key: string,
  status = 400,
): Response {
  return json(lang, null, key, code, status);
}

// ==================== 入口 ====================

export default {
  // jsr 模块的类型在本地不可用 → req/ctx 显式标注（运行时由 Deno 提供）
  fetch: withSupabase(
    { auth: ['publishable', 'secret'] },
    async (
      req: Request,
      ctx: { supabase: SupabaseClient; supabaseAdmin: SupabaseClient },
    ) => {
      if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
      }

      const path = new URL(req.url).pathname;
      const lang = detectLang(req);

      try {
        if (path.endsWith('/auth/otp/send')) {
          return await otpSend(req, ctx, lang);
        }
        if (path.endsWith('/auth/otp/verify')) {
          return await otpVerify(req, ctx, lang);
        }
        if (path.endsWith('/auth/refresh')) {
          return await authRefresh(req, lang);
        }
        if (path.endsWith('/auth/logout')) {
          return await authLogout(req, lang);
        }
        if (path.endsWith('/menus/all')) {
          // 管理专用全量树：放在 /menus 前缀判断之前，避免被 endsWith('/menus') 误吞
          return await menusListAll(req, ctx, lang);
        }
        if (path.endsWith('/auth/menus')) {
          return await menusList(req, ctx, lang);
        }
        if (path.endsWith('/menus')) {
          return await menusCreate(req, ctx, lang);
        }
        const menuId = path.match(/\/menus\/(\d+)$/);
        if (menuId) {
          if (req.method === 'PUT')
            return await menusUpdate(req, ctx, lang, Number(menuId[1]));
          if (req.method === 'DELETE')
            return await menusDelete(req, ctx, lang, Number(menuId[1]));
        }

        // ── 用户管理（supabaseAdmin：列 auth.users / 改角色 / 禁用须 admin 客户端）──
        if (path.endsWith('/auth/users')) {
          return await usersList(req, ctx, lang);
        }
        if (path.endsWith('/auth/roles')) {
          return await rolesList(req, ctx, lang);
        }
        const rolePerms = path.match(/\/auth\/roles\/([\w-]+)\/permissions$/);
        if (rolePerms) {
          if (req.method === 'GET')
            return await rolesGetPermissions(req, ctx, lang, rolePerms[1]);
          if (req.method === 'PUT')
            return await rolesSavePermissions(req, ctx, lang, rolePerms[1]);
        }
        const userRoles = path.match(/\/users\/([\w-]+)\/roles$/);
        if (userRoles && req.method === 'PUT') {
          return await usersAssignRoles(req, ctx, lang, userRoles[1]);
        }
        const userBan = path.match(/\/users\/([\w-]+)\/ban$/);
        if (userBan && req.method === 'PUT') {
          return await usersBan(req, ctx, lang, userBan[1]);
        }

        return error(lang, 404, 'notFound', 404);
      } catch (e) {
        console.error('[iam] unhandled:', e);
        return error(lang, 500, 'internalError', 500);
      }
    },
  ),
};

// ==================== OTP 两步流 ====================

async function otpSend(
  req: Request,
  { supabase: sb }: { supabase: SupabaseClient },
  lang: string,
): Promise<Response> {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return error(lang, 1001, 'invalidBody');
  }
  if (!body.email) return error(lang, 1002, 'emailRequired');

  const { error: otpErr } = await sb.auth.signInWithOtp({
    email: body.email,
    options: { shouldCreateUser: true },
  });
  if (otpErr) console.error('[iam] otp send failed:', otpErr.message);
  return json(lang, { success: true });
}

async function otpVerify(
  req: Request,
  { supabase: sb }: { supabase: SupabaseClient },
  lang: string,
): Promise<Response> {
  let body: { email?: string; code?: string | number };
  try {
    body = await req.json();
  } catch {
    return error(lang, 1001, 'invalidBody');
  }
  if (!body.email || !body.code) return error(lang, 1002, 'codeRequired');

  const { data, error: vErr } = await sb.auth.verifyOtp({
    email: body.email,
    token: String(body.code),
    type: 'email',
  });
  if (vErr || !data?.session) {
    // 业务校验失败走 400（error() 默认态）：401 会命中前端 401 会话失效链路
    // （独立态整页跳 /login；集成态宿主 refresh→handleLogout），把本应展示在
    // 验证码弹窗里的 msg 吞掉。401 只留给真正的会话失效。
    return error(lang, 1003, 'codeInvalid');
  }

  return json(lang, {
    token: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: {
      id: data.user.id,
      username: body.email.split('@')[0],
      email: body.email,
    },
  });
}

// ==================== 会话刷新（独立态单飞刷新的数据源） ====================

/**
 * POST /auth/refresh { refreshToken } —— GoTrue 会话轮换（匿名端点，凭 refresh_token 本身）。
 *
 * 实现走 GoTrue HTTP API（POST /auth/v1/token?grant_type=refresh_token）而非
 * supabase-js 的 setSession/refreshSession：服务端 SDK 的这些方法设计给「持有
 * session 的客户端」，Edge Fn 侧无会话上下文，直接调 GoTrue grant 端点最稳定。
 * 响应与登录端点同形状（token/refreshToken 双发——GoTrue 轮换会同时更新两者，
 * 调用方须覆盖本地 refreshToken）。
 *
 * 安全：refresh_token 一次性（GoTrue rotate 语义）——旧值在响应后失效，前端必须
 * 持久化响应里的新 refreshToken（iam 独立态的 STANDALONE_REFRESH_KEY）。
 */
async function authRefresh(req: Request, lang: string): Promise<Response> {
  let body: { refreshToken?: string };
  try {
    body = await req.json();
  } catch {
    return error(lang, 1001, 'invalidBody');
  }
  if (!body.refreshToken) return error(lang, 1017, 'refreshRequired');

  // GoTrue 端点与 anon key：Deno env 由平台注入（SUPABASE_URL / SUPABASE_ANON_KEY）
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) {
    console.error('[iam] refresh env missing');
    return error(lang, 500, 'internalError', 500);
  }

  const goTrueRes = await fetch(
    `${url}/auth/v1/token?grant_type=refresh_token`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: anonKey,
      },
      body: JSON.stringify({ refresh_token: body.refreshToken }),
    },
  );
  if (!goTrueRes.ok) {
    // refresh_token 失效/已轮换/用户被禁 → 401 语义（前端单飞失败 → 跳登录）
    return new Response(
      JSON.stringify({
        code: 1004,
        data: null,
        msg: msg(lang, 'refreshInvalid'),
      }),
      {
        status: 401,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      },
    );
  }
  const session = (await goTrueRes.json()) as {
    access_token: string;
    refresh_token: string;
  };
  return json(lang, {
    token: session.access_token,
    refreshToken: session.refresh_token,
  });
}

// ==================== 登出（GoTrue signOut，宿主角落是清本地会话） ====================

/**
 * POST /auth/logout —— GoTrue 会话登出（凭 Bearer access_token）。
 *
 * 语义：登出在宿主侧主要是清本地会话（handleLogout 清 store/cache）；GoTrue 侧
 * signOut 使 access/refresh token 失效是「尽力而为」——失败不致命（用户已本地登出，
 * 服务端 token 随过期自然失效）。故恒返回成功，失败仅 warn。
 */
async function authLogout(req: Request, lang: string): Promise<Response> {
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) {
    console.error('[iam] logout env missing');
    return error(lang, 500, 'internalError', 500);
  }

  const authHeader = req.headers.get('authorization');
  const res = await fetch(`${url}/auth/v1/logout`, {
    method: 'POST',
    headers: {
      ...(authHeader ? { authorization: authHeader } : {}),
      apikey: anonKey,
      'content-type': 'application/json',
    },
    body: '{}',
  });
  if (!res.ok) console.warn('[iam] logout failed:', res.status);
  return json(lang, { success: true });
}

// ==================== 菜单管理（RBAC，见 migrations/0001） ====================

/** menus 表行（任务 11-04 修订后的新契约，初始化迁移 0001 的列集） */
interface MenuRow {
  id: number;
  pid: number | null;
  /** 语义权限码（system:menu:list）；目录/菜单=进入权限、按钮=操作权限、空=公开 */
  permission: string | null;
  name: string;
  component: string;
  uri: string | null;
  type: 'app' | 'menu' | 'button' | 'group';
  sort: number;
  icon: string | null;
  active_icon: string | null;
  hidden: boolean;
  scopes: string[]; // 适用范围：A=管理端 C=客户端（含 C 即游客可见）
}

/** 菜单管理页可写的字段集合（id/pid/created_at 由服务端管理） */
interface MenuInput {
  pid?: number | null;
  /** 语义权限码（system:menu:list 等；空 = 公开） */
  permission?: string | null;
  name?: string;
  component?: string | null;
  uri?: string | null;
  type?: MenuRow['type'];
  sort?: number;
  icon?: string | null;
  active_icon?: string | null;
  hidden?: boolean;
  scopes?: string[];
}

const MENU_COLUMNS =
  'id,pid,permission,name,component,uri,type,sort,icon,active_icon,hidden,scopes';

/**
 * 类型联动校验矩阵（任务 11-04，用户提示词 F3）：
 * 前端页面与 mock 共用同语义（src/utils/menu-validate.ts），此处为 Deno 侧镜像实现。
 * 违例清单为空数组 = 通过；否则返回违例字段名（前端按其 i18n 展示，服务端统一 1014）。
 */
const TYPE_FIELD_MATRIX: Record<
  MenuRow['type'],
  {
    uri: 'required' | 'optional' | 'hidden';
    component: boolean;
    icon: boolean;
    needsPid: boolean;
  }
> = {
  app: { uri: 'required', component: true, icon: true, needsPid: false },
  group: { uri: 'hidden', component: false, icon: false, needsPid: false },
  menu: { uri: 'required', component: true, icon: true, needsPid: false },
  button: { uri: 'hidden', component: false, icon: false, needsPid: true },
};

/**
 * 按类型校验写请求体（create 全量 / update 部分更新两种模式）。
 * 违例 → Error('VALIDATION:<field>')；调用方映射 1014。
 * - scopes：多选必填，值域 A/C，至少一项（两模式都查——适用范围无默认值）。
 * - uri：矩阵 required 时非空；hidden 类型即使传了也忽略（不写入）。
 * - component/icon/active_icon：矩阵 false 的类型忽略（不入库）。
 */
function validateMenuFields(
  input: MenuInput,
  type: MenuRow['type'],
  partial: boolean,
): void {
  const matrix = TYPE_FIELD_MATRIX[type];
  const missing: string[] = [];
  if (
    matrix.uri === 'required' &&
    (input.uri == null || !String(input.uri).trim())
  ) {
    missing.push('uri');
  }
  if (matrix.needsPid && input.pid == null) missing.push('pid');
  if (!input.scopes || input.scopes.length === 0) missing.push('scopes');
  if (input.scopes?.some((s) => s !== 'A' && s !== 'C')) missing.push('scopes');
  if (missing.length) throw new Error(`VALIDATION:${missing.join(',')}`);
  void partial;
}

/**
 * 从 Authorization 头解 JWT 用户；无/无效 token 返回 null（匿名）。
 * 注意：GET /auth/menus 的匿名不是错误（走游客子集分支，design DD2/DD3），
 * 只有写端点把 null 视为 401。
 */
async function resolveUser(
  ctx: { supabase: SupabaseClient },
  authHeader: string | null,
): Promise<{ id: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;
  const { data, error } = await ctx.supabase.auth.getUser(token);
  return error || !data?.user ? null : { id: data.user.id };
}

/** 用户的权限码并集；admin 含 '*' 通配（seed），此处原样返回由调用方判定。
 *  两步查询：user_roles 与 role_permissions 无直接 FK（两者都只引用 roles），
 *  嵌入查询 role_permissions(permission) 会被 PostgREST 判为无关系 → 空集。
 *  先取 role_id，再按 role_id 集取 permission。
 *  用 supabaseAdmin（service role）：这些表开了 RLS，publishable 读不到。 */
async function userPermissions(
  ctx: { supabaseAdmin: SupabaseClient },
  userId: string,
): Promise<string[]> {
  const { data: roleRows, error: roleErr } = await ctx.supabaseAdmin
    .from('user_roles')
    .select('role_id')
    .eq('user_id', userId);
  if (roleErr || !roleRows?.length) return [];

  const roleIds = roleRows.map((r: { role_id: number }) => r.role_id);
  const { data: permRows, error: permErr } = await ctx.supabaseAdmin
    .from('role_permissions')
    .select('permission')
    .in('role_id', roleIds);
  if (permErr) return [];

  return (permRows ?? []).map((p: { permission: string }) => p.permission);
}

/** 构建期节点：children 恒为数组（出口处终叶归 null，见 prune） */
interface BuildNode extends MenuRow {
  children: BuildNode[];
}

/** 出口节点：children 可空（旧契约语义） */
interface MenuNode extends MenuRow {
  children: MenuNode[] | null;
}

/** 平铺行 → children 嵌套树（pid 关联，sort 升序稳定排序，与旧后端返回形状一致）。 */
function toTree(rows: MenuRow[]): MenuNode[] {
  const byId = new Map<number, BuildNode>();
  const roots: BuildNode[] = [];
  for (const row of [...rows].sort((a, b) => a.sort - b.sort)) {
    byId.set(row.id, { ...row, children: [] });
  }
  for (const node of byId.values()) {
    const parent = node.pid != null ? byId.get(node.pid) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const prune = (nodes: BuildNode[]): MenuNode[] =>
    nodes.map((node) => ({
      ...node,
      children: node.children.length ? prune(node.children) : null,
    }));
  return prune(roots);
}

/** 全量菜单树（登录用户基础数据）。用 supabaseAdmin：menus 表开了 RLS。 */
async function fetchAllRows(ctx: {
  supabaseAdmin: SupabaseClient;
}): Promise<MenuRow[]> {
  const { data, error } = await ctx.supabaseAdmin
    .from('menus')
    .select(MENU_COLUMNS)
    .order('sort', { ascending: true });
  if (error) throw new Error(`[iam] menus query failed: ${error.message}`);
  return (data ?? []) as MenuRow[];
}

/**
 * GET /menus/all —— 菜单管理专用：登录 + system:menu:list 权限码 → 全量树
 * （含 hidden 与 button——管理页要看到待发布节点与按钮权限码；与 /auth/menus
 * 的「按用户权限过滤」不同，这里是「能进菜单管理的人看全量」）。
 * 无 JWT → 401；无 system:menu:list → 403（requirePermission 统一语义）。
 */
async function menusListAll(
  req: Request,
  ctx: { supabase: SupabaseClient; supabaseAdmin: SupabaseClient },
  lang: string,
): Promise<Response> {
  const auth = await requirePermission(ctx, req, lang, 'system:menu:list');
  if (auth instanceof Response) return auth;

  const rows = await fetchAllRows(ctx);
  return json(lang, toTree(rows));
}

/**
 * GET /auth/menus —— 匿名 → 游客可见子集；有效 JWT → 按权限过滤（无码门槛）。
 *
 * 过滤规则（任务 11-06 RBAC：permission 语义权限码）：
 * - 匿名：hidden=false 且 scopes 含 'C' 且 type!=='button'（按钮是权限粒度非导航）
 *   的节点 + 为保持树形完整的祖先链。
 * - 登录非 admin：节点可见 ⇔ hidden=false 且（permission 为空 = 公开 或
 *   permission ∈ 用户权限集）。
 * - admin（权限含 '*'）：全量（含 hidden——管理员要能看到待发布的节点）。
 */
async function menusList(
  req: Request,
  ctx: { supabase: SupabaseClient; supabaseAdmin: SupabaseClient },
  lang: string,
): Promise<Response> {
  const rows = await fetchAllRows(ctx);
  const user = await resolveUser(ctx, req.headers.get('authorization'));

  // 匿名 → 游客子集
  if (!user) {
    const visible = new Set<number>();
    const keep = (row: MenuRow) => {
      if (visible.has(row.id)) return;
      visible.add(row.id);
      // 祖先链入集（即便父节点自身 hidden/scope 不达标，子节点可见时父链保留）
      if (row.pid != null) {
        const parent = rows.find((r) => r.id === row.pid);
        if (parent) keep(parent);
      }
    };
    for (const row of rows) {
      if (!row.hidden && row.scopes.includes('C') && row.type !== 'button') {
        keep(row);
      }
    }
    return json(lang, toTree(rows.filter((r) => visible.has(r.id))));
  }

  // 登录 → 按权限过滤（无码门槛——菜单树是壳的公共数据，任何登录用户都要能拉到
  // 自己的过滤树；system:menu:list 只作为「菜单管理」菜单节点的 permission 值，
  // 控制该菜单项是否出现在过滤结果里，而非给整个 /auth/menus 加 403 门槛）
  const perms = await userPermissions(ctx, user.id);
  if (perms.includes('*')) {
    return json(lang, toTree(rows));
  }
  const permSet = new Set(perms);
  const visible = new Set<number>();
  const keep = (row: MenuRow) => {
    if (visible.has(row.id)) return;
    visible.add(row.id);
    if (row.pid != null) {
      const parent = rows.find((r) => r.id === row.pid);
      if (parent) keep(parent);
    }
  };
  for (const row of rows) {
    // 语义权限码（任务 11-06 RBAC 重构）：permission 空 = 公开（所有登录用户可见）；
    // 非空 = 需角色授权该码；祖先链由 keep 保留；hidden 即使授权也不显示（admin '*' 已短路）。
    if (!row.hidden && (!row.permission || permSet.has(row.permission)))
      keep(row);
  }
  return json(lang, toTree(rows.filter((r) => visible.has(r.id))));
}

/**
 * 接口鉴权前置（RBAC 语义权限码）：无 JWT → 401；角色无该权限码且非 '*' → 403；通过 → 返回 user。
 * 只校验权限码，不校验角色（行业标准铁律）——admin 即「角色默认持有 '*'」。
 */
async function requirePermission(
  ctx: { supabase: SupabaseClient; supabaseAdmin: SupabaseClient },
  req: Request,
  lang: string,
  perm: string,
): Promise<{ id: string } | Response> {
  const user = await resolveUser(ctx, req.headers.get('authorization'));
  if (!user) {
    return new Response(
      JSON.stringify({
        code: 1010,
        data: null,
        msg: msg(lang, 'unauthorized'),
      }),
      {
        status: 401,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      },
    );
  }
  const perms = await userPermissions(ctx, user.id);
  if (!perms.includes('*') && !perms.includes(perm)) {
    return new Response(
      JSON.stringify({ code: 1011, data: null, msg: msg(lang, 'forbidden') }),
      {
        status: 403,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      },
    );
  }
  return user;
}

/**
 * 归一化写请求体（类型裁剪 + 矩阵校验）；违例 → Error('VALIDATION:...')。
 * permission 由请求体携带（选填，空 = 公开）；无「编码」字段（11-06 已删 code）。
 */
function parseMenuInput(
  body: Record<string, unknown>,
  partial: boolean,
): MenuInput {
  const input: MenuInput = {};
  if (body.pid !== undefined)
    input.pid = body.pid === null ? null : Number(body.pid);
  if (body.name !== undefined) input.name = String(body.name).trim();
  if (body.component !== undefined)
    input.component = body.component === null ? null : String(body.component);
  if (body.uri !== undefined)
    input.uri = body.uri === null ? null : String(body.uri);
  if (body.type !== undefined) input.type = body.type as MenuRow['type'];
  if (body.sort !== undefined) input.sort = Number(body.sort) || 0;
  if (body.icon !== undefined)
    input.icon = body.icon === null ? null : String(body.icon);
  // activeIcon（camelCase，前端 MenuInput 形态）与 active_icon（snake_case，DB 列）
  // 双形态入参兼容——camelCase 会被 DB 静默丢弃，故必须归一
  const rawActiveIcon =
    body.active_icon !== undefined ? body.active_icon : body.activeIcon;
  if (rawActiveIcon !== undefined)
    input.active_icon = rawActiveIcon === null ? null : String(rawActiveIcon);
  if (body.hidden !== undefined) input.hidden = !!body.hidden;
  if (body.permission !== undefined)
    input.permission =
      body.permission === null ? null : String(body.permission).trim();
  if (body.scopes !== undefined)
    input.scopes = Array.isArray(body.scopes)
      ? (body.scopes as string[]).map((s) => String(s))
      : [];

  // 类型必填兜底（create）：type/name
  const type = input.type ?? 'app';
  if (!['app', 'menu', 'button', 'group'].includes(type)) {
    throw new Error('VALIDATION:type');
  }
  if (!partial && !input.name) {
    throw new Error('VALIDATION:name');
  }
  // 按类型矩阵裁剪隐藏字段（group/button 不带 component/icon/uri——写了也不入库）
  const matrix = TYPE_FIELD_MATRIX[type];
  if (matrix.uri === 'hidden') input.uri = null;
  if (!matrix.component) input.component = null;
  if (!matrix.icon) {
    input.icon = null;
    input.active_icon = null;
  }
  validateMenuFields(input, type, partial);
  return input;
}

/** 校验/冲突类失败 → 业务 error 响应（复用调用方的 lang）。 */
function asErrorResponse(lang: string, e: unknown): Response | null {
  if (e instanceof Response) return e;
  if (e instanceof Error && e.message.startsWith('VALIDATION')) {
    return error(lang, 1014, 'typeMismatch');
  }
  return null;
}

async function menusCreate(
  req: Request,
  ctx: { supabase: SupabaseClient; supabaseAdmin: SupabaseClient },
  lang: string,
): Promise<Response> {
  const auth = await requirePermission(ctx, req, lang, 'system:menu:create');
  if (auth instanceof Response) return auth;
  const user = auth;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return error(lang, 1001, 'invalidBody');
  }

  let input: MenuInput;
  try {
    input = parseMenuInput(body, false);
  } catch (e) {
    const resp = asErrorResponse(lang, e);
    return resp ?? error(lang, 500, 'internalError');
  }

  const insert = {
    ...input,
    component: input.component ?? null,
  };
  const { data, error: dbErr } = await ctx.supabaseAdmin
    .from('menus')
    .insert(insert)
    .select(MENU_COLUMNS)
    .single();
  if (dbErr) {
    console.error('[iam] menu create failed:', dbErr.message);
    return error(lang, 500, 'internalError');
  }
  return json(lang, data);
}

async function menusUpdate(
  req: Request,
  ctx: { supabase: SupabaseClient; supabaseAdmin: SupabaseClient },
  lang: string,
  id: number,
): Promise<Response> {
  const auth = await requirePermission(ctx, req, lang, 'system:menu:update');
  if (auth instanceof Response) return auth;
  const user = auth;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return error(lang, 1001, 'invalidBody');
  }

  let input: MenuInput;
  try {
    input = parseMenuInput(body, true);
  } catch (e) {
    const resp = asErrorResponse(lang, e);
    return resp ?? error(lang, 500, 'internalError');
  }

  // pid 自环/成环不做图遍历校验——FK 存在，自环由触发器外的应用层约定（MVP 接受）；
  // 真成环会导致 toTree 孤儿分支，重拉列表即可发现。
  const { data, error: dbErr } = await ctx.supabaseAdmin
    .from('menus')
    .update(input)
    .eq('id', id)
    .select(MENU_COLUMNS)
    .single();
  if (dbErr) {
    console.error('[iam] menu update failed:', dbErr.message);
    return error(lang, 1013, 'menuNotFound', 404);
  }
  return json(lang, data);
}

async function menusDelete(
  req: Request,
  ctx: { supabase: SupabaseClient; supabaseAdmin: SupabaseClient },
  lang: string,
  id: number,
): Promise<Response> {
  const auth = await requirePermission(ctx, req, lang, 'system:menu:delete');
  if (auth instanceof Response) return auth;
  const user = auth;

  // 级联子树由 FK on delete cascade 完成（design DD1）；删不存在的 id 返回 404 语义
  const { data, error: dbErr } = await ctx.supabaseAdmin
    .from('menus')
    .delete()
    .eq('id', id)
    .select('id')
    .single();
  if (dbErr || !data) return error(lang, 1013, 'menuNotFound', 404);
  return json(lang, { id });
}

// ==================== 用户管理（supabaseAdmin：auth.users 只 admin 可达） ====================

/** 用户行（列表出参）：auth.users 主档 + 角色聚合 */
interface UserRow {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  roles: string[]; // 角色编码列表（'admin' / 'guest'）
}

/** 从 user_roles join roles 聚合全部用户-角色映射（一次查询，内存分组）。 */
async function fetchAllUserRoles(ctx: {
  supabaseAdmin: SupabaseClient;
}): Promise<Map<string, string[]>> {
  const { data, error } = await ctx.supabaseAdmin
    .from('user_roles')
    .select('user_id, roles(code)');
  if (error) throw new Error(`[iam] user_roles query failed: ${error.message}`);
  const map = new Map<string, string[]>();
  for (const row of data ?? []) {
    const list = map.get(row.user_id) ?? [];
    list.push(row.roles.code);
    map.set(row.user_id, list);
  }
  return map;
}

/** 触发器给每个用户至少一个角色（首个 admin 余者 guest）——空角色视为数据异常，返回空列表由前端兜底。 */
async function usersList(
  req: Request,
  ctx: { supabase: SupabaseClient; supabaseAdmin: SupabaseClient },
  lang: string,
): Promise<Response> {
  const auth = await requirePermission(ctx, req, lang, 'system:user:list');
  if (auth instanceof Response) return auth;

  // service role 列 auth.users（auth schema 对 publishable 不可见）
  const { data, error } = await ctx.supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 200, // MVP 上限；分页 UI 另任务
  });
  if (error) {
    console.error('[iam] listUsers failed:', error.message);
    return error(lang, 500, 'internalError', 500);
  }

  const roleMap = await fetchAllUserRoles(ctx);
  const users: UserRow[] = data.users.map(
    (u: {
      id: string;
      email: string | null;
      created_at: string;
      last_sign_in_at: string | null;
      banned_until: string | null;
    }) => ({
      id: u.id,
      email: u.email ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      banned_until: u.banned_until,
      roles: roleMap.get(u.id) ?? [],
    }),
  );
  return json(lang, users);
}

/** 校验角色编码列表（admin/guest 之外的码 → invalidRoles 400）。 */
/** 校验角色编码列表（roles 表不存在的码 → invalidRoles 400）。 */
function invalidRolesResponse(lang: string): Response {
  return new Response(
    JSON.stringify({ code: 1016, data: null, msg: msg(lang, 'invalidRoles') }),
    {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    },
  );
}

async function validateRoleCodes(
  ctx: { supabase: SupabaseClient; supabaseAdmin: SupabaseClient },
  roleCodes: string[],
  lang: string,
): Promise<Response | null> {
  if (!roleCodes.length) return invalidRolesResponse(lang);
  const { data, error } = await ctx.supabaseAdmin
    .from('roles')
    .select('code')
    .in('code', roleCodes);
  if (error || !data || data.length !== new Set(roleCodes).size) {
    return invalidRolesResponse(lang);
  }
  return null;
}

/** PUT /users/:id/roles —— 全量替换角色绑定（admin-only）。 */
async function usersAssignRoles(
  req: Request,
  ctx: { supabase: SupabaseClient; supabaseAdmin: SupabaseClient },
  lang: string,
  userId: string,
): Promise<Response> {
  const auth = await requirePermission(ctx, req, lang, 'system:user:assign');
  if (auth instanceof Response) return auth;

  let body: { roles?: string[] };
  try {
    body = await req.json();
  } catch {
    return error(lang, 1001, 'invalidBody');
  }
  const roleCodes = body.roles ?? [];
  const invalid = await validateRoleCodes(ctx, roleCodes, lang);
  if (invalid) return invalid;

  // 全量替换：先删后插（事务性靠 supabaseAdmin 的连续调用；MVP 接受非原子窗口）
  const { error: delErr } = await ctx.supabaseAdmin
    .from('user_roles')
    .delete()
    .eq('user_id', userId);
  if (delErr) {
    console.error('[iam] user roles delete failed:', delErr.message);
    return error(lang, 500, 'internalError', 500);
  }
  const roleIds = await ctx.supabaseAdmin
    .from('roles')
    .select('id, code')
    .in('code', roleCodes);
  const { error: insErr } = await ctx.supabaseAdmin.from('user_roles').insert(
    (roleIds.data ?? []).map((r: { id: number }) => ({
      user_id: userId,
      role_id: r.id,
    })),
  );
  if (insErr) {
    console.error('[iam] user roles insert failed:', insErr.message);
    return error(lang, 500, 'internalError', 500);
  }
  return json(lang, { id: userId, roles: roleCodes });
}

/**
 * PUT /users/:id/ban —— 禁用/恢复（admin-only）。
 * 禁用走 GoTrue banned_until（auth.admin.updateUserById）：被禁用户下次登录
 * 由 GoTrue 直接拒绝；自禁保护（管理员不能禁用自己）。
 */
async function usersBan(
  req: Request,
  ctx: { supabase: SupabaseClient; supabaseAdmin: SupabaseClient },
  lang: string,
  userId: string,
): Promise<Response> {
  const auth = await requirePermission(ctx, req, lang, 'system:user:ban');
  if (auth instanceof Response) return auth;
  const self = auth as { id: string };

  let body: { disabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return error(lang, 1001, 'invalidBody');
  }
  if (body.disabled === undefined) return error(lang, 1001, 'invalidBody');

  // 自禁保护：禁用自己会让当前会话的后续操作全数失效（且 GoTrue 禁用即踢）
  const caller = await ctx.supabase.auth.getUser();
  if (caller.data?.user?.id === userId && body.disabled) {
    return new Response(
      JSON.stringify({ code: 1015, data: null, msg: msg(lang, 'selfBan') }),
      {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      },
    );
  }

  // 永久禁用 = 远未来时间戳；恢复 = null
  const banned_until = body.disabled ? '2999-01-01T00:00:00Z' : null;
  const { error: banErr } = await ctx.supabaseAdmin.auth.admin.updateUserById(
    userId,
    { ban_duration: body.disabled ? '876000h' : 'none' },
  );
  if (banErr) {
    console.error('[iam] ban user failed:', banErr.message);
    return error(lang, 500, 'internalError', 500);
  }
  void banned_until;
  return json(lang, { id: userId, disabled: !!body.disabled });
}

// ==================== 角色管理（require 权限码；授权 permission → role_permissions） ====================

/** 角色行（列表出参）：roles 表 + 授权权限码数 */
interface RoleRow {
  id: number;
  code: string;
  name: string;
  permissionCount: number; // 授权码数量（'*' 记 1）
}

/** 角色列表：roles 表 + 每个角色的授权码数量。 */
async function rolesList(
  req: Request,
  ctx: { supabase: SupabaseClient; supabaseAdmin: SupabaseClient },
  lang: string,
): Promise<Response> {
  const auth = await requirePermission(ctx, req, lang, 'system:role:list');
  if (auth instanceof Response) return auth;

  const { data: roles, error: rolesErr } = await ctx.supabaseAdmin
    .from('roles')
    .select('id, code, name')
    .order('id', { ascending: true });
  if (rolesErr) {
    console.error('[iam] roles query failed:', rolesErr.message);
    return error(lang, 500, 'internalError', 500);
  }

  const { data: perms, error: permsErr } = await ctx.supabaseAdmin
    .from('role_permissions')
    .select('role_id');
  if (permsErr) {
    console.error('[iam] role_permissions query failed:', permsErr.message);
    return error(lang, 500, 'internalError', 500);
  }
  const countByRole = new Map<number, number>();
  for (const p of perms ?? []) {
    countByRole.set(p.role_id, (countByRole.get(p.role_id) ?? 0) + 1);
  }

  const result: RoleRow[] = (roles ?? []).map(
    (r: { id: number; code: string; name: string }) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      permissionCount: countByRole.get(r.id) ?? 0,
    }),
  );
  return json(lang, result);
}

/** 角色 id 解析：'*' 或数字；roles 表不存在 → 404。 */
async function resolveRoleId(
  ctx: { supabase: SupabaseClient; supabaseAdmin: SupabaseClient },
  raw: string,
): Promise<number | Response> {
  const numeric = Number(raw);
  if (!Number.isInteger(numeric)) {
    return new Response(
      JSON.stringify({ code: 1013, data: null, msg: '角色不存在' }),
      {
        status: 404,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      },
    );
  }
  const { data } = await ctx.supabaseAdmin
    .from('roles')
    .select('id')
    .eq('id', numeric)
    .limit(1);
  if (!data || data.length === 0) {
    return new Response(
      JSON.stringify({ code: 1013, data: null, msg: '角色不存在' }),
      {
        status: 404,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      },
    );
  }
  return numeric;
}

/** GET /auth/roles/:id/permissions —— 该角色已授权 permission 集合（'*' 记入）。 */
async function rolesGetPermissions(
  req: Request,
  ctx: { supabase: SupabaseClient; supabaseAdmin: SupabaseClient },
  lang: string,
  rawId: string,
): Promise<Response> {
  const auth = await requirePermission(ctx, req, lang, 'system:role:list');
  if (auth instanceof Response) return auth;

  const roleId = await resolveRoleId(ctx, rawId);
  if (roleId instanceof Response) return roleId;

  const { data, error: err } = await ctx.supabaseAdmin
    .from('role_permissions')
    .select('permission')
    .eq('role_id', roleId);
  if (err) {
    console.error('[iam] role permissions query failed:', err.message);
    return error(lang, 500, 'internalError', 500);
  }
  return json(
    lang,
    (data ?? []).map((r: { permission: string }) => r.permission),
  );
}

/**
 * PUT /auth/roles/:id/permissions —— 全量替换授权。
 * 值域校验：每个值必须是 menus 表的 permission 或 '*'（'*' 即 admin 通配全量）。
 * 自保护：admin 角色的授权不可清空（清空后系统无管理员，谁也进不了角色页）。
 */
async function rolesSavePermissions(
  req: Request,
  ctx: { supabase: SupabaseClient; supabaseAdmin: SupabaseClient },
  lang: string,
  rawId: string,
): Promise<Response> {
  const auth = await requirePermission(ctx, req, lang, 'system:role:assign');
  if (auth instanceof Response) return auth;

  const roleId = await resolveRoleId(ctx, rawId);
  if (roleId instanceof Response) return roleId;

  let body: { permissions?: string[] };
  try {
    body = await req.json();
  } catch {
    return error(lang, 1001, 'invalidBody');
  }
  const permissions = body.permissions ?? [];
  if (!permissions.length) {
    return new Response(
      JSON.stringify({
        code: 1018,
        data: null,
        msg: msg(lang, 'rolesRequired'),
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      },
    );
  }

  // 值域校验：'*' 或 menus 表存在的 permission
  const menuPerms = new Set<string>();
  if (permissions.some((p) => p !== '*')) {
    const { data: menus, error: mErr } = await ctx.supabaseAdmin
      .from('menus')
      .select('permission')
      .in(
        'permission',
        permissions.filter((p) => p !== '*'),
      );
    if (mErr) {
      console.error('[iam] menus permission query failed:', mErr.message);
      return error(lang, 500, 'internalError', 500);
    }
    for (const m of menus ?? []) if (m.permission) menuPerms.add(m.permission);
  }
  const invalid = permissions.filter((p) => p !== '*' && !menuPerms.has(p));
  if (invalid.length) {
    return new Response(
      JSON.stringify({
        code: 1016,
        data: null,
        msg: msg(lang, 'invalidRoles'),
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      },
    );
  }

  // 先删后插（全量替换；非原子窗口同用户管理 assignRoles，MVP 接受）
  const { error: delErr } = await ctx.supabaseAdmin
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId);
  if (delErr) {
    console.error('[iam] role permissions delete failed:', delErr.message);
    return error(lang, 500, 'internalError', 500);
  }
  const { error: insErr } = await ctx.supabaseAdmin
    .from('role_permissions')
    .insert(permissions.map((permission) => ({ role_id: roleId, permission })));
  if (insErr) {
    console.error('[iam] role permissions insert failed:', insErr.message);
    return error(lang, 500, 'internalError', 500);
  }
  return json(lang, { id: roleId, permissions });
}

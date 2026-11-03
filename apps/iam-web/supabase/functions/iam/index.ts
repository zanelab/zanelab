// iam: Edge Function — email OTP 两步登录 + 菜单管理
//
// 端点：
//   POST   /auth/otp/send   { email }       → { code: 0, data: { success: true } }
//   POST   /auth/otp/verify { email, code }   → { code: 0, data: { token, refreshToken, user } }
//   GET    /auth/menus      （匿名可调）      → 游客可见子集；有效 JWT → 按权限过滤的菜单树
//   POST   /menus           { ...菜单字段 }   → 新建（仅 admin）
//   PUT    /menus/:id       { ...菜单字段 }   → 更新（仅 admin）
//   DELETE /menus/:id                         → 删除（级联子树，仅 admin）
//
// 鉴权：菜单端点不做匿名拒绝——GET 无/无效 JWT 时返回游客可见子集
// （hidden=false AND scopes @>'{O}' 且无权限要求 + 祖先链）；写端点要求
// admin（第一个注册用户，user_roles 触发器分配，见 migrations/0001）。
// 无 JWT 写 → 1010/401；非 admin 写 → 1011/403；code 重复 → 1012/400。
//
// 语言：前端通过 Accept-Language header 传 locale（zh-CN / en-US），缺省 zh-CN。
// envelope { code, data, msg } 对齐 portal http.ts 解包；code 0 = 成功。
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from 'jsr:@supabase/server@^1';

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
    codeExists: '菜单编码已存在',
    menuNotFound: '菜单不存在',
    menuRequired: '菜单名称和编码不能为空',
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
    codeExists: 'Menu code already exists',
    menuNotFound: 'Menu not found',
    menuRequired: 'Menu name and code are required',
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
  fetch: withSupabase({ auth: ['publishable', 'secret'] }, async (req, ctx) => {
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
          return await menusDelete(ctx, lang, Number(menuId[1]));
      }

      return error(lang, 404, 'notFound', 404);
    } catch (e) {
      console.error('[iam] unhandled:', e);
      return error(lang, 500, 'internalError', 500);
    }
  }),
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

// ==================== 菜单管理（RBAC，见 migrations/0001） ====================

/** 旧项目 RawMenuItem 契约的数据库行（menus 表字段一一对应） */
interface MenuRow {
  id: number;
  pid: number | null;
  code: string;
  parent: string;
  name: string;
  component: string;
  uri: string | null;
  type: 'app' | 'menu' | 'button' | 'group';
  sort: number;
  icon: string | null;
  hidden: boolean;
  scopes: string[];
  menu_type: number;
}

/** 菜单管理页可写的字段集合（id/pid/parent/created_at 由服务端管理） */
interface MenuInput {
  pid?: number | null;
  code?: string;
  parent?: string;
  name?: string;
  component?: string;
  uri?: string | null;
  type?: MenuRow['type'];
  sort?: number;
  icon?: string | null;
  hidden?: boolean;
  scopes?: string[];
  menu_type?: number;
}

const MENU_COLUMNS =
  'id,pid,code,parent,name,component,uri,type,sort,icon,hidden,scopes,menu_type';

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

/** 用户是否 admin：user_roles join roles.code='admin'。 */
async function isAdmin(
  ctx: { supabase: SupabaseClient },
  userId: string,
): Promise<boolean> {
  const { data } = await ctx.supabase
    .from('user_roles')
    .select('roles!inner(code)')
    .eq('user_id', userId)
    .eq('roles.code', 'admin')
    .limit(1);
  return !!data && data.length > 0;
}

/** 用户的权限码并集；admin 含 '*' 通配（seed），此处原样返回由调用方判定。 */
async function userPermissions(
  ctx: { supabase: SupabaseClient },
  userId: string,
): Promise<string[]> {
  const { data } = await ctx.supabase
    .from('user_roles')
    .select('role_permissions(permission)')
    .eq('user_id', userId);
  return (data ?? []).flatMap(
    (row: { role_permissions: { permission: string }[] }) =>
      (row.role_permissions ?? []).map((p) => p.permission),
  );
}

/** 平铺行 → children 嵌套树（pid 关联，sort 升序稳定排序，与旧后端返回形状一致）。 */
function toTree(rows: MenuRow[]): (MenuRow & { children: MenuRow[] | null })[] {
  const byId = new Map<number, MenuRow & { children: MenuRow[] }>();
  const roots: (MenuRow & { children: MenuRow[] })[] = [];
  for (const row of [...rows].sort((a, b) => a.sort - b.sort)) {
    byId.set(row.id, { ...row, children: [] });
  }
  for (const node of byId.values()) {
    const parent = node.pid != null ? byId.get(node.pid) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  // 无子的层级不返回空 children（旧契约 children 可为 null）
  const prune = (nodes: (MenuRow & { children: MenuRow[] })[]): MenuRow[] =>
    nodes.map(({ children, ...rest }) => ({
      ...rest,
      children: children.length ? (prune(children) as MenuRow[]) : null,
    }));
  return prune(roots) as (MenuRow & { children: MenuRow[] | null })[];
}

/** 全量菜单树（登录用户基础数据）。 */
async function fetchAllRows(ctx: {
  supabase: SupabaseClient;
}): Promise<MenuRow[]> {
  const { data, error } = await ctx.supabase
    .from('menus')
    .select(MENU_COLUMNS)
    .order('sort', { ascending: true });
  if (error) throw new Error(`[iam] menus query failed: ${error.message}`);
  return (data ?? []) as MenuRow[];
}

/**
 * GET /auth/menus —— 匿名 → 游客可见子集；有效 JWT → 按权限过滤。
 *
 * 过滤规则（design DD3）：
 * - 匿名：hidden=false 且 scopes 含 'O' 且 type!=='button'（按钮无独立 uri，游客无意义）
 *   的节点 + 为保持树形完整的祖先链。
 * - 登录非 admin：节点可见 ⇔ hidden=false 且（type!=='button' 或其权限码 uri ∈ 用户权限集）。
 * - admin（权限含 '*'）：全量（含 hidden——管理员要能看到待发布的节点）。
 */
async function menusList(
  req: Request,
  ctx: { supabase: SupabaseClient },
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
      if (!row.hidden && row.scopes.includes('O') && row.type !== 'button') {
        keep(row);
      }
    }
    return json(lang, toTree(rows.filter((r) => visible.has(r.id))));
  }

  // 登录 → 按权限过滤
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
    const permRequired = row.type === 'button';
    const allowed =
      !row.hidden &&
      (!permRequired || (row.uri != null && permSet.has(row.uri)));
    if (allowed) keep(row);
  }
  return json(lang, toTree(rows.filter((r) => visible.has(r.id))));
}

/** 写端点的公共前置：无 JWT → 401；非 admin → 403；通过 → 返回 user。 */
async function requireAdmin(
  ctx: { supabase: SupabaseClient },
  req: Request,
  lang: string,
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
  if (!(await isAdmin(ctx, user.id))) {
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

/** 校验并归一化写请求体；非法 → 抛 Response（1011 之外的 4xx）。 */
function parseMenuInput(
  body: Record<string, unknown>,
  partial: boolean,
): MenuInput {
  const input: MenuInput = {};
  if (body.pid !== undefined)
    input.pid = body.pid === null ? null : Number(body.pid);
  if (body.code !== undefined) input.code = String(body.code).trim();
  if (body.parent !== undefined) input.parent = String(body.parent);
  if (body.name !== undefined) input.name = String(body.name).trim();
  if (body.component !== undefined) input.component = String(body.component);
  if (body.uri !== undefined)
    input.uri = body.uri === null ? null : String(body.uri);
  if (body.type !== undefined) input.type = body.type as MenuRow['type'];
  if (body.sort !== undefined) input.sort = Number(body.sort) || 0;
  if (body.icon !== undefined)
    input.icon = body.icon === null ? null : String(body.icon);
  if (body.hidden !== undefined) input.hidden = !!body.hidden;
  if (body.scopes !== undefined)
    input.scopes = (body.scopes as string[]) ?? ['O'];
  if (body.menu_type !== undefined)
    input.menu_type = Number(body.menu_type) ?? 1;

  if (!partial && (!input.name || !input.code)) {
    throw new Error('VALIDATION');
  }
  if (input.type && !['app', 'menu', 'button', 'group'].includes(input.type)) {
    throw new Error('VALIDATION');
  }
  return input;
}

/** 校验/冲突类失败 → 业务 error 响应（复用调用方的 lang）。 */
function asErrorResponse(lang: string, e: unknown): Response | null {
  if (e instanceof Response) return e;
  if (e instanceof Error && e.message === 'VALIDATION') {
    return error(lang, 1001, 'invalidBody');
  }
  return null;
}

async function menusCreate(
  req: Request,
  ctx: { supabase: SupabaseClient },
  lang: string,
): Promise<Response> {
  const auth = await requireAdmin(ctx, req, lang);
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

  // code 唯一冲突 → 1012
  const { data: dup } = await ctx.supabase
    .from('menus')
    .select('id')
    .eq('code', input.code!)
    .limit(1);
  if (dup && dup.length > 0) return error(lang, 1012, 'codeExists');

  const insert = {
    ...input,
    parent: input.parent ?? 'root',
    component: input.component ?? '',
  };
  const { data, error: dbErr } = await ctx.supabase
    .from('menus')
    .insert(insert)
    .select(MENU_COLUMNS)
    .single();
  if (dbErr) {
    // Postgres unique_violation 兜底（并发插入同 code）
    if (dbErr.code === '23505') return error(lang, 1012, 'codeExists');
    console.error('[iam] menu create failed:', dbErr.message);
    return error(lang, 500, 'internalError');
  }
  return json(lang, data);
}

async function menusUpdate(
  req: Request,
  ctx: { supabase: SupabaseClient },
  lang: string,
  id: number,
): Promise<Response> {
  const auth = await requireAdmin(ctx, req, lang);
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

  if (input.code) {
    const { data: dup } = await ctx.supabase
      .from('menus')
      .select('id')
      .eq('code', input.code)
      .neq('id', id)
      .limit(1);
    if (dup && dup.length > 0) return error(lang, 1012, 'codeExists');
  }

  // pid 自环/成环不做图遍历校验——FK 存在，自环由触发器外的应用层约定（MVP 接受）；
  // 真成环会导致 toTree 孤儿分支，重拉列表即可发现。
  const { data, error: dbErr } = await ctx.supabase
    .from('menus')
    .update(input)
    .eq('id', id)
    .select(MENU_COLUMNS)
    .single();
  if (dbErr) {
    if (dbErr.code === '23505') return error(lang, 1012, 'codeExists');
    console.error('[iam] menu update failed:', dbErr.message);
    return error(lang, 1013, 'menuNotFound', 404);
  }
  return json(lang, data);
}

async function menusDelete(
  req: Request,
  ctx: { supabase: SupabaseClient },
  lang: string,
  id: number,
): Promise<Response> {
  const auth = await requireAdmin(ctx, req, lang);
  if (auth instanceof Response) return auth;
  const user = auth;

  // 级联子树由 FK on delete cascade 完成（design DD1）；删不存在的 id 返回 404 语义
  const { data, error: dbErr } = await ctx.supabase
    .from('menus')
    .delete()
    .eq('id', id)
    .select('id')
    .single();
  if (dbErr || !data) return error(lang, 1013, 'menuNotFound', 404);
  return json(lang, { id });
}

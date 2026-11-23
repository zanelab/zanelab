// skills: Edge Function — 技能市场 CRUD（skills-web 自己的 Supabase 项目）
//
// 端点（接口规划见 .trellis/tasks/11-23-skills-crud-mock/prd.md）：
//   GET    /skills      （匿名可调）           → 技能全量列表（公开读，父任务决策 D1）
//   GET    /skills/:id  （匿名可调）           → 单条详情（编辑表单回填）
//   POST   /skills      { ...技能字段 }        → 新建（skills:skill:create）
//   PUT    /skills/:id  { ...技能字段 }        → 全量更新（skills:skill:update）
//   DELETE /skills/:id                         → 删除（skills:skill:delete）
//
// 鉴权：requirePermission 只校验权限码不校验角色（iam Edge Fn 同款铁律）——
// admin 即角色默认持 '*' 通配。读端点匿名不拒绝（D1：市场页游客可浏览）；
// 写端点无 JWT → 1010/401，无该权限码 → 1011/403。
// 权限数据源 = supabaseAdmin 所指项目的 role_permissions（RBAC 是 iam 域——
// 部署在 zanelab 主项目时与 iam 同库即通；独立部署时指自己的项目）。
//
// 语言：x-client-info 头 lang= 字段（主通道）→ accept-language 兼容 → en-US
// 缺省（/zh/i 检测）——与 iam fn detectLang 同实现（骨架复制自 iam fn，见各段注释）。
// envelope { code, data, msg }，code 0 = 成功。
// jsr: 导入由 Deno 运行时解析；本地 tsc（校验用）解析不了 jsr 前缀，前置 expect-error。
// 修改本文件后以 `tsc -p supabase/functions/tsconfig.json` 做类型检查。
// @ts-expect-error jsr module — resolved by Deno runtime
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

// @ts-expect-error jsr module — resolved by Deno runtime
import { withSupabase } from 'jsr:@supabase/server@^1';

// @ts-expect-error jsr module — resolved by Deno runtime
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

// ==================== i18n（msg 双语，骨架复制自 iam fn detectLang/t 段） ====================

const t: Record<string, Record<string, string>> = {
  'zh-CN': {
    ok: 'ok',
    notFound: '技能不存在',
    invalidBody: '请求格式错误',
    titleRequired: '技能名称不能为空',
    ratingInvalid: '评分必须是 1–5 的整数',
    internalError: '服务器内部错误',
    unauthorized: '请先登录',
    forbidden: '没有执行此操作的权限',
  },
  'en-US': {
    ok: 'ok',
    notFound: 'Skill not found',
    invalidBody: 'Invalid request body',
    titleRequired: 'Skill title is required',
    ratingInvalid: 'Rating must be an integer between 1 and 5',
    internalError: 'Internal server error',
    unauthorized: 'Please sign in first',
    forbidden: 'You do not have permission to perform this action',
  },
};

function msg(lang: string, key: string): string {
  return t[lang]?.[key] ?? t['zh-CN'][key] ?? key;
}

/**
 * 语言识别（iam fn detectLang 同实现）：x-client-info 的 lang= 字段是主通道
 * （网关 CORS 白名单机制见 iam fn 注释），accept-language 兼容，缺省 en-US。
 */
function detectLang(req: Request): string {
  const clientInfo = req.headers.get('x-client-info') ?? '';
  const langPair = clientInfo
    .split(',')
    .map((kv) => kv.trim())
    .find((kv) => kv.startsWith('lang='));
  if (langPair) return /zh/i.test(langPair) ? 'zh-CN' : 'en-US';
  const h = req.headers.get('accept-language') ?? '';
  return /zh/i.test(h) ? 'zh-CN' : 'en-US';
}

// ==================== 响应工具（CORS 注释见 iam fn——预检由平台网关应答） ====================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, apikey, content-type, accept-language',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, PATCH, DELETE, OPTIONS',
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
  msgKey: string,
  status = 400,
): Response {
  return new Response(
    JSON.stringify({ code, data: null, msg: msg(lang, msgKey) }),
    { status, headers: { ...corsHeaders, 'content-type': 'application/json' } },
  );
}

// ==================== 鉴权（复制自 iam fn resolveUser / userPermissions） ====================

/**
 * 从 Authorization 头解 JWT 用户；无/无效 token 返回 null（匿名）。
 * GET 端点把 null 视为合法的公开读（父任务决策 D1）；写端点把 null 视为 401。
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

/**
 * 用户的权限码并集；admin 含 '*' 通配（seed）。两步查询：user_roles 与
 * role_permissions 无直接 FK（两者都只引用 roles），嵌入查询会被 PostgREST
 * 判为无关系 → 空集；先取 role_id，再按 role_id 集取 permission。
 * 用 supabaseAdmin（service role）：这些表开了 RLS，publishable 读不到。
 */
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

/** 写端点鉴权前置：无 JWT → 401（unauthorized）；无权限码 → 403（forbidden）。 */
async function requirePermission(
  ctx: { supabase: SupabaseClient; supabaseAdmin: SupabaseClient },
  req: Request,
  lang: string,
  perm: string,
): Promise<{ id: string } | Response> {
  const user = await resolveUser(ctx, req.headers.get('authorization'));
  if (!user) return error(lang, 1010, 'unauthorized', 401);
  const perms = await userPermissions(ctx, user.id);
  if (!perms.includes('*') && !perms.includes(perm)) {
    return error(lang, 1011, 'forbidden', 403);
  }
  return user;
}

// ==================== 技能域 ====================

/** POST/PUT 可写字段（camelCase 入参契约——新接口无历史包袱，不做 iam fn 的
 *  双形态兼容；updated_at/created_at/id 由服务端管理）。 */
interface SkillInput {
  title?: string;
  free?: boolean;
  featured?: boolean;
  outputTypes?: string[];
  roles?: string[];
  scenes?: string[];
  downloads?: number;
  bookmarks?: number;
  rating?: number;
  tone?: string;
  agents?: string[];
}

const SKILL_COLUMNS =
  'id,title,free,featured,output_types,roles,scenes,downloads,bookmarks,rating,tone,agents,created_at,updated_at';

/** 值域（0001 注释：服务端只做类型校验，不做白名单——值域由前端约定承载）。 */
const TONES = ['primary', 'secondary', 'accent', 'info', 'success', 'warning'];

/**
 * 写请求体解析与校验（create 全量 / update 部分更新两模式）。
 * 值域校验：title 必填、rating 1–5 整数、tone 枚举；数组字段必须为数组。
 * 违例 → Error('VALIDATION:<key>')，调用方映射 1014。
 */
function parseSkillInput(
  body: Record<string, unknown>,
  partial: boolean,
): SkillInput {
  const input: SkillInput = {};
  if (body.title !== undefined) input.title = String(body.title).trim();
  if (body.free !== undefined) input.free = !!body.free;
  if (body.featured !== undefined) input.featured = !!body.featured;
  for (const key of ['outputTypes', 'roles', 'scenes', 'agents'] as const) {
    if (body[key] !== undefined) {
      if (!Array.isArray(body[key])) throw new Error(`VALIDATION:${key}`);
      input[key] = (body[key] as unknown[]).map((v) => String(v));
    }
  }
  if (body.downloads !== undefined)
    input.downloads = Number(body.downloads) || 0;
  if (body.bookmarks !== undefined)
    input.bookmarks = Number(body.bookmarks) || 0;
  if (body.rating !== undefined) {
    const n = Number(body.rating);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      throw new Error('VALIDATION:rating');
    }
    input.rating = n;
  }
  if (body.tone !== undefined) {
    const tone = String(body.tone);
    if (!TONES.includes(tone)) throw new Error('VALIDATION:tone');
    input.tone = tone;
  }

  // create 必填兜底：title
  if (!partial && !input.title) throw new Error('VALIDATION:title');
  // update 空串 title：trim 后空 = 未提供有效值，视为违例（title 恒非空约束）
  if (partial && input.title !== undefined && !input.title) {
    throw new Error('VALIDATION:title');
  }
  return input;
}

/**
 * SkillInput（camel 入参契约）→ DB 列片段（insert/update 的 body）。
 * 唯一的蛇形列是 output_types——直接展开 camel 对象会让 PostgREST 撞
 * 「column outputTypes 不存在」（PGRST204 → 500）；其余单字段名与列同名。
 * mock 侧同款映射见 skill-handlers.ts pickInput（两处必须同步改）。
 */
function toRowValues(input: SkillInput): Record<string, unknown> {
  const { outputTypes, ...rest } = input;
  return outputTypes === undefined
    ? { ...rest }
    : { ...rest, output_types: outputTypes };
}

/** 列表（GET，匿名可调）：全量，sort 由前端承载（服务端不分页/筛选——接口规划）。 */
async function skillsList(
  ctx: { supabaseAdmin: SupabaseClient },
  lang: string,
): Promise<Response> {
  const { data, error: dbErr } = await ctx.supabaseAdmin
    .from('skills')
    .select(SKILL_COLUMNS)
    .order('id', { ascending: true });
  if (dbErr) {
    console.error('[skills] list failed:', dbErr.message);
    return error(lang, 500, 'internalError');
  }
  return json(lang, data ?? []);
}

/** 详情（GET，匿名可调）。不存在 → 1013/404。 */
async function skillsGet(
  ctx: { supabaseAdmin: SupabaseClient },
  lang: string,
  id: number,
): Promise<Response> {
  const { data, error: dbErr } = await ctx.supabaseAdmin
    .from('skills')
    .select(SKILL_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (dbErr) {
    console.error('[skills] get failed:', dbErr.message);
    return error(lang, 500, 'internalError');
  }
  if (!data) return error(lang, 1013, 'notFound', 404);
  return json(lang, data);
}

/** 新建（POST，require skills:skill:create）。 */
async function skillsCreate(
  req: Request,
  ctx: { supabase: SupabaseClient; supabaseAdmin: SupabaseClient },
  lang: string,
): Promise<Response> {
  const auth = await requirePermission(ctx, req, lang, 'skills:skill:create');
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return error(lang, 1001, 'invalidBody');
  }
  let input: SkillInput;
  try {
    input = parseSkillInput(body, false);
  } catch (e) {
    if ((e as Error).message.startsWith('VALIDATION:')) {
      return error(lang, 1014, 'invalidBody');
    }
    throw e;
  }

  const { data, error: dbErr } = await ctx.supabaseAdmin
    .from('skills')
    .insert(toRowValues(input))
    .select(SKILL_COLUMNS)
    .single();
  if (dbErr) {
    console.error('[skills] create failed:', dbErr.message);
    return error(lang, 500, 'internalError');
  }
  return json(lang, data);
}

/** 全量更新（PUT，require skills:skill:update）。不存在 → 1013/404。 */
async function skillsUpdate(
  req: Request,
  ctx: { supabase: SupabaseClient; supabaseAdmin: SupabaseClient },
  lang: string,
  id: number,
): Promise<Response> {
  const auth = await requirePermission(ctx, req, lang, 'skills:skill:update');
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return error(lang, 1001, 'invalidBody');
  }
  let input: SkillInput;
  try {
    input = parseSkillInput(body, true);
  } catch (e) {
    if ((e as Error).message.startsWith('VALIDATION:')) {
      return error(lang, 1014, 'invalidBody');
    }
    throw e;
  }

  // updated_at 服务端管理（update 语义的一部分，前端不传）
  const { data, error: dbErr } = await ctx.supabaseAdmin
    .from('skills')
    .update({ ...toRowValues(input), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(SKILL_COLUMNS)
    .maybeSingle();
  if (dbErr) {
    console.error('[skills] update failed:', dbErr.message);
    return error(lang, 500, 'internalError');
  }
  if (!data) return error(lang, 1013, 'notFound', 404);
  return json(lang, data);
}

/** 删除（DELETE，require skills:skill:delete）。不存在 → 1013/404。 */
async function skillsDelete(
  req: Request,
  ctx: { supabase: SupabaseClient; supabaseAdmin: SupabaseClient },
  lang: string,
  id: number,
): Promise<Response> {
  const auth = await requirePermission(ctx, req, lang, 'skills:skill:delete');
  if (auth instanceof Response) return auth;

  const { data, error: dbErr } = await ctx.supabaseAdmin
    .from('skills')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (dbErr) {
    console.error('[skills] delete failed:', dbErr.message);
    return error(lang, 500, 'internalError');
  }
  if (!data) return error(lang, 1013, 'notFound', 404);
  return json(lang, data);
}

// ==================== 入口（withSupabase 骨架同 iam fn） ====================

/** 路径尾段 id（/skills/123 → 123；非数字 → null）。 */
function tailId(path: string): number | null {
  const m = path.match(/\/skills\/(\d+)\/?$/);
  return m ? Number(m[1]) : null;
}

export default {
  // jsr 模块的类型在本地不可用 → req/ctx 显式标注（运行时由 Deno 提供）
  fetch: withSupabase(
    { auth: ['publishable', 'secret'] },
    async (
      req: Request,
      ctx: { supabase: SupabaseClient; supabaseAdmin: SupabaseClient },
    ) => {
      // 兜底分支：预检正常情况下到不了这里（平台网关先行拦答，见 corsHeaders
      // 注释）；保留以防网关策略变化时函数仍能自洽应答
      if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
      }

      const path = new URL(req.url).pathname;
      const lang = detectLang(req);

      try {
        // 集合端点在前（避免被 /skills/:id 的正则吞掉）
        if (path.endsWith('/skills') && req.method === 'GET') {
          return await skillsList(ctx, lang);
        }
        if (path.endsWith('/skills') && req.method === 'POST') {
          return await skillsCreate(req, ctx, lang);
        }
        const id = tailId(path);
        if (id != null) {
          if (req.method === 'GET') return await skillsGet(ctx, lang, id);
          if (req.method === 'PUT') {
            return await skillsUpdate(req, ctx, lang, id);
          }
          if (req.method === 'DELETE') {
            return await skillsDelete(req, ctx, lang, id);
          }
        }
        return error(lang, 404, 'notFound', 404);
      } catch (e) {
        console.error('[skills] unhandled:', e);
        return error(lang, 500, 'internalError');
      }
    },
  ),
};

// skills-upload: Edge Function — 技能资源上传（multipart → Storage → 公开 URL）
//
// 任务 11-25-skills-form-upload：技能包（单文件 zip）与效果展示（多文件
// 图片/视频）的上传端点。骨架（envelope/鉴权/CORS）复制自 functions/skills
// （同款 requirePermission 模式，来源注释见彼处）。
//
// 契约：
//   POST /skills-upload   multipart/form-data，字段名 file
//     → requirePermission('skills:skill:create' 或 'skills:skill:update'
//       —— 两码任一持有即可上传（新建前无 update 场景）
//     → 类型白名单（扩展名 + mime 双校验）+ 50MB 上限 → 1014
//     → service role 转存 Storage skill-assets/<yyyyMMdd>/<random>-<filename>
//     → { url: <public URL> }
//
// 为什么走 fn 转存而非前端直传 Storage：写权限收敛在 fn（publishable key
// 直写桶需放行 storage 写策略，攻击面大）；fn 侧可校验类型/大小。
// @ts-expect-error jsr module — resolved by Deno runtime
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

// @ts-expect-error jsr module — resolved by Deno runtime
import { withSupabase } from 'jsr:@supabase/server@^1';

// @ts-expect-error jsr module — resolved by Deno runtime
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

// ==================== i18n（msg 双语，同 skills fn） ====================

const t: Record<string, Record<string, string>> = {
  'zh-CN': {
    ok: 'ok',
    invalidBody: '请求格式错误',
    fileRequired: '缺少上传文件（字段名 file）',
    typeNotAllowed: '不支持的文件类型',
    tooLarge: '文件超过 50MB 上限',
    internalError: '服务器内部错误',
    unauthorized: '请先登录',
    forbidden: '没有执行此操作的权限',
  },
  'en-US': {
    ok: 'ok',
    invalidBody: 'Invalid request body',
    fileRequired: 'Missing file field (name: file)',
    typeNotAllowed: 'File type not allowed',
    tooLarge: 'File exceeds the 50MB limit',
    internalError: 'Internal server error',
    unauthorized: 'Please sign in first',
    forbidden: 'You do not have permission to perform this action',
  },
};

function msg(lang: string, key: string): string {
  return t[lang]?.[key] ?? t['zh-CN'][key] ?? key;
}

/** 语言识别（skills fn detectLang 同实现）。 */
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

// ==================== 响应工具（同 skills fn） ====================

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

// ==================== 鉴权（skills fn resolveUser / userPermissions 同实现） ====================

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

/** 上传权限：create 或 update 任一持有即可（新建技能前无 update 场景）。 */
async function requireUploadPermission(
  ctx: { supabase: SupabaseClient; supabaseAdmin: SupabaseClient },
  req: Request,
  lang: string,
): Promise<{ id: string } | Response> {
  const user = await resolveUser(ctx, req.headers.get('authorization'));
  if (!user) return error(lang, 1010, 'unauthorized', 401);
  const perms = await userPermissions(ctx, user.id);
  if (perms.includes('*')) return user;
  if (
    !perms.includes('skills:skill:create') &&
    !perms.includes('skills:skill:update')
  ) {
    return error(lang, 1011, 'forbidden', 403);
  }
  return user;
}

// ==================== 校验 ====================

const BUCKET = 'skill-assets';
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

/** 扩展名 → 允许的 mime 前缀（扩展名 + mime 双校验）。 */
const ALLOWED: Record<string, string[]> = {
  zip: [
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream',
  ],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  webp: ['image/webp'],
  gif: ['image/gif'],
  mp4: ['video/mp4'],
  webm: ['video/webm'],
};

function validateFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!(ext in ALLOWED)) return 'typeNotAllowed';
  if (!ALLOWED[ext].includes(file.type) && file.type !== '') {
    return 'typeNotAllowed';
  }
  if (file.size > MAX_SIZE) return 'tooLarge';
  return null;
}

/** Storage 对象路径：<yyyyMMdd>/<random>-<filename>（日期分桶便于清理）。 */
function objectPath(filename: string): string {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomUUID().slice(0, 8);
  const safe = filename.replace(/[^\w.\-]+/g, '_');
  return `${day}/${rand}-${safe}`;
}

export default {
  fetch: withSupabase(
    { auth: ['publishable', 'secret'] },
    async (
      req: Request,
      ctx: { supabase: SupabaseClient; supabaseAdmin: SupabaseClient },
    ) => {
      if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
      }

      const lang = detectLang(req);

      try {
        if (req.method !== 'POST') return error(lang, 404, 'invalidBody', 404);

        const auth = await requireUploadPermission(ctx, req, lang);
        if (auth instanceof Response) return auth;

        let form: FormData;
        try {
          form = await req.formData();
        } catch {
          return error(lang, 1001, 'invalidBody');
        }
        const file = form.get('file');
        if (!(file instanceof File)) return error(lang, 1014, 'fileRequired');

        const invalid = validateFile(file);
        if (invalid) return error(lang, 1014, invalid);

        const path = objectPath(file.name);
        const { error: upErr } = await ctx.supabaseAdmin.storage
          .from(BUCKET)
          .upload(path, file, {
            contentType: file.type || 'application/octet-stream',
            upsert: false,
          });
        if (upErr) {
          console.error('[skills-upload] storage failed:', upErr.message);
          return error(lang, 500, 'internalError');
        }

        const { data: pub } = ctx.supabaseAdmin.storage
          .from(BUCKET)
          .getPublicUrl(path);
        return json(lang, {
          url: pub.publicUrl,
          name: file.name,
          size: file.size,
        });
      } catch (e) {
        console.error('[skills-upload] unhandled:', e);
        return error(lang, 500, 'internalError');
      }
    },
  ),
};

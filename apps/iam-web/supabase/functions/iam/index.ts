// iam: Edge Function — email OTP 两步登录
//
// 端点：
//   POST /auth/otp/send   { email }       → { code: 0, data: { success: true } }
//   POST /auth/otp/verify { email, code }   → { code: 0, data: { token, refreshToken, user } }
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
  },
  'en-US': {
    ok: 'ok',
    notFound: 'Not found',
    invalidBody: 'Invalid request body',
    emailRequired: 'Email is required',
    codeRequired: 'Email and code are required',
    codeInvalid: 'Verification code is invalid or expired',
    internalError: 'Internal server error',
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

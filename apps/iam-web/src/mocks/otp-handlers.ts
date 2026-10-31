import { delay, http, HttpResponse } from 'msw';

/*
 * iam 子应用 OTP mock handler（iam 自身接口的 mock 契约，云 Supabase Edge Fn
 * 不可达时替代联调）。
 *
 * 契约 = Edge Fn 真实实现（apps/iam-web/supabase/functions/iam/index.ts OTP 段）：
 * - envelope { code, data, msg }，code 0 成功
 * - POST /functions/v1/auth/otp/send  { email } → { success: true }
 * - POST /functions/v1/auth/otp/verify { email, code } → { token, refreshToken, user }
 *
 * 拦截拓扑（MSW = 页面 origin 的 Service Worker，只拦页面自身 fetch）：
 * - 独立态：本应用页面（:8081）fetch /functions/v1/... → 本 SW 直拦
 * - 集成态：portal 页面（:5173）fetch /iam/functions/v1/... → **SW 拦截发生在
 *   宿主 vite proxy 转发之前**，handler 必须按页面级完整路径（带 /iam 前缀）
 *   登记——不启动本 worker 或路径不带前缀，转发落到 8081 vite server（无路由）
 *   → 404（2026-10-26 实测踩坑，见 mocks/browser.ts 注释）
 *
 * 宿主 worker 不登记 iam 路由（宿主不代子应用持有 mock 契约）。
 *
 * mock 侧不校验真实验证码——固定接受 6 位数字（123456 提示在 README）；
 * 行为差异：发码恒 success（Edge Fn 防枚举同款）；验码失败返 1003。
 */

/** 6 位数字即通过（mock 无真实邮件，README 提示用 123456） */
const isSixDigits = (code: unknown) =>
  typeof code === 'string' && /^\d{6}$/.test(code);

const ok = (data: unknown) => HttpResponse.json({ code: 0, data, msg: 'ok' });

const fail = (code: number, msg: string, status = 400) =>
  HttpResponse.json({ code, data: null, msg }, { status });

/** 发码/验码共用：集成态页面 fetch 带 /iam 前缀（apiPrefix 从 basename 派生，
 * SW 拦截发生在宿主 proxy rewrite **之前**，handler 必须按页面级完整路径登记）；
 * 独立态无前缀——两种路径形态都登记，独立运行性（:8081 直开）才有 mock 可拦。 */
const otpPaths = (suffix: 'send' | 'verify'): string[] => [
  `/iam/functions/v1/auth/otp/${suffix}`,
  `/functions/v1/auth/otp/${suffix}`,
];

export const iamOtpHandlers = [
  // 步骤 1 发码：模拟 GoTrue signInWithOtp（恒 success，防枚举同款语义）
  ...otpPaths('send').map((path) =>
    http.post(path, async ({ request }) => {
      await delay(300);
      const body = (await request.json().catch(() => null)) as {
        email?: string;
      } | null;
      if (!body?.email) return fail(1002, 'email is required');
      return ok({ success: true });
    }),
  ),

  // 步骤 2 验码：6 位数字通过 → token/refreshToken/user 三元组（M1 出参形状）
  ...otpPaths('verify').map((path) =>
    http.post(path, async ({ request }) => {
      await delay(300);
      const body = (await request.json().catch(() => null)) as {
        email?: string;
        code?: string;
      } | null;
      if (!body?.email || !body?.code)
        return fail(1002, 'email and code are required');
      if (!isSixDigits(body.code)) return fail(1003, '验证码错误或已过期', 401);

      const email = body.email;
      return ok({
        token: 'mock-iam-access-token',
        refreshToken: 'mock-iam-refresh-token',
        user: {
          id: 'mock-user-id',
          username: email.split('@')[0],
          email,
        },
      });
    }),
  ),
];

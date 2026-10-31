/*
 * iam-web 端点常量 —— **零 import**（不要在这里引任何模块）。
 *
 * 为什么必须零依赖：mock worker 在独立 bundle 里 import 本模块
 * （src/mocks/otp-handlers.ts）。一旦引入 ../main 的 getProps()，整个应用入口
 * 模块会被拖进 worker bundle，并可能形成循环依赖。
 * 运行时的 API 前缀**不走常量**：src/api/auth.ts 从 props.basename 派生
 * （独立运行性要求，见下）；INTEGRATION_PREFIX 只服务 mock。
 */

/**
 * 集成态宿主代理前缀 = 子应用 activeRule（`/iam`）。
 *
 * 只给 mock 用：MSW 的 SW 注册在**页面 origin** 上，拦截发生在宿主 vite proxy
 * rewrite（剥 /iam）之前，handler 必须按页面级完整路径登记；mock 里读不到
 * props.basename，故在此以常量固化。api 层运行时的前缀仍从 props.basename
 * 派生（独立态缺省为空 → 请求直落本 dev server，见 api/auth.ts）。
 *
 * 改子应用 activeRule 时须同步：apps/portal-web/public/config.js 的
 * microApps.iam.activeRule。
 */
export const INTEGRATION_PREFIX = '/iam';

/**
 * OTP 发码路径（相对页面 origin 的完整路径，不含集成态前缀）。
 *
 * 路径段 `iam` 是 Supabase Edge Function 的**函数名**（不是目录），须与
 * apps/iam-web/supabase/functions/iam/ 的部署名同步
 * （`pnpm exec supabase functions deploy iam`）；改名时此处与 README 的 curl 一起改。
 */
export const OTP_SEND_PATH = '/functions/v1/iam/auth/otp/send';

/** OTP 验码路径（同上：`iam` 段是 Edge Function 函数名，改名须同步部署名）。 */
export const OTP_VERIFY_PATH = '/functions/v1/iam/auth/otp/verify';

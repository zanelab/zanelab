import { setupWorker } from 'msw/browser';
import { iamOtpHandlers } from './otp-handlers';

/*
 * iam-web MSW worker（iam 自身接口的 mock 承担者，两种形态都拦）：
 * - 独立 dev：本应用页面（:8081 origin）发出的请求被本 SW 直拦
 *   （handler 无 /iam 前缀，如 /functions/v1/auth/otp/*）
 * - 集成态：请求发自 portal 页面（:5173 origin）经宿主 vite proxy 转发——
 *   **SW 注册在页面 origin 上**，qiankun 集成态下本应用代码跑在 5173 页面
 *   进程里，worker.start 注册的是 5173 的 /mockServiceWorker.js，拦截页面
 *   全部 fetch（含带 /iam 前缀的）；proxy rewrite 剥掉的前缀不影响 SW 拦截
 *   （拦截发生在转发之前）。启动点：main.tsx 的 mount 回调 + 独立分支
 *   （幂等 startMockWorker）——**集成态不启动则无任何拦截者**，转发落到
 *   8081 vite server（无路由）→ 404。
 * handler 是 iam 自身的 mock 契约（./otp-handlers），不放 packages——
 * portal 不再消费它（宿主不持有子应用 mock，apps 间不共享代码）。
 */
export const worker = setupWorker(...iamOtpHandlers);

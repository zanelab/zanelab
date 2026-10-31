/*
 * BizCodeError / isSessionExpiredError（portal session-expired 语义的共享载体）。
 *
 * 任务 10-29-vben-request-client D1：旧 createHttpClient 工厂已删除（消费方
 * portal/iam-web 均已迁移到 RequestClient + 预置拦截器组装模式，见
 * ../preset-interceptors）。BizCodeError / isSessionExpiredError 导出面保留
 * （apps/portal-web/src/micro/register.ts 消费 isSessionExpiredError；
 * portal utils/http.ts 消费 BizCodeError 类型）。
 */
import type { AxiosError } from 'axios';

// ==================== 错误类型 ====================

export interface BizCodeError extends Error {
  bizCode?: string | number;
}

// ==================== 辅助 ====================

/**
 * 是否「登录态失效」错误（含业务码命中或 HTTP 401）。
 * 供启动期 / 非 React 上下文使用。
 */
export function isSessionExpiredError(error: unknown): boolean {
  const bizCode = (error as BizCodeError | undefined)?.bizCode;
  if (bizCode === '401') return true;
  return (error as AxiosError | undefined)?.response?.status === 401;
}

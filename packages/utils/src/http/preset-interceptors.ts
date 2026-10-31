import type { RequestClient } from './request-client';
import type { MakeErrorMessageFn, ResponseInterceptorConfig } from './types';

import { isFunction } from './helpers';

import axios from 'axios';

export const defaultResponseInterceptor = ({
  codeField = 'code',
  dataField = 'data',
  successCode = 0,
}: {
  /** 响应数据中代表访问结果的字段名 */
  codeField?: string;
  /** 响应数据中装载实际数据的字段名，或者提供一个函数从响应数据中解析需要返回的数据 */
  dataField?: ((response: any) => any) | string;
  /** 当codeField所指定的字段值与successCode相同时，代表接口访问成功。如果提供一个函数，则返回true代表接口访问成功 */
  successCode?: ((code: any) => boolean) | number | string;
} = {}): ResponseInterceptorConfig => {
  return {
    fulfilled: (response) => {
      const { config, data: responseData, status } = response;

      if (config.responseReturn === 'raw') {
        return response;
      }

      if (status >= 200 && status < 400) {
        if (config.responseReturn === 'body') {
          return responseData;
        }
        // 非 envelope 守卫（本仓库适配）：body 非对象或不含 codeField 时，
        // 'data' 语义按 'body' 放行（对齐旧 createHttpClient 对非 envelope
        // 响应原样放行的行为，防止 blob/纯文本/无 code 对象被误判失败）。
        const isEnvelope =
          responseData !== null &&
          typeof responseData === 'object' &&
          codeField in responseData;
        if (
          isEnvelope &&
          (isFunction(successCode)
            ? successCode(responseData[codeField])
            : responseData[codeField] === successCode)
        ) {
          return isFunction(dataField)
            ? dataField(responseData)
            : responseData[dataField];
        }
        if (!isEnvelope) {
          return responseData;
        }
      }
      throw Object.assign({}, response, { response });
    },
  };
};

export const authenticateResponseInterceptor = ({
  client,
  doReAuthenticate,
  doRefreshToken,
  enableRefreshToken,
  formatToken,
  tokenHeaderName,
}: {
  client: RequestClient;
  doReAuthenticate: () => Promise<void>;
  doRefreshToken: () => Promise<string>;
  enableRefreshToken: boolean;
  formatToken: (token: string) => null | string;
  /** 本仓库适配：token 头名。设置后重试/队列重放写 config.headers[tokenHeaderName]；缺省保持 vben 默认写 Authorization。 */
  tokenHeaderName?: string;
}): ResponseInterceptorConfig => {
  /** 重试前把新 token 写入指定头（缺省 Authorization，参数化见上）。 */
  function setTokenHeader(config: any, newToken: string) {
    if (tokenHeaderName) {
      config.headers[tokenHeaderName] = formatToken(newToken);
    } else {
      config.headers.Authorization = formatToken(newToken);
    }
  }

  return {
    rejected: async (error) => {
      const { config, response } = error;
      // 如果不是 401 错误，直接抛出异常
      if (response?.status !== 401) {
        throw error;
      }
      // 判断是否启用了 refreshToken 功能
      // 如果没有启用或者已经是重试请求了，直接跳转到重新登录
      if (!enableRefreshToken || config.__isRetryRequest) {
        await doReAuthenticate();
        throw error;
      }
      // 如果正在刷新 token，则将请求加入队列，等待刷新完成
      if (client.isRefreshing) {
        return new Promise((resolve) => {
          client.refreshTokenQueue.push((newToken: string) => {
            setTokenHeader(config, newToken);
            resolve(client.request(config.url, { ...config }));
          });
        });
      }

      // 标记开始刷新 token
      client.isRefreshing = true;
      // 标记当前请求为重试请求，避免无限循环
      config.__isRetryRequest = true;

      try {
        const newToken = await doRefreshToken();

        // 处理队列中的请求
        client.refreshTokenQueue.forEach((callback) => callback(newToken));
        // 清空队列
        client.refreshTokenQueue = [];

        setTokenHeader(config, newToken);
        return client.request(error.config.url, { ...error.config });
      } catch (refreshError) {
        // 如果刷新 token 失败，处理错误（如强制登出或跳转登录页面）
        client.refreshTokenQueue.forEach((callback) => callback(''));
        client.refreshTokenQueue = [];
        console.error('Refresh token failed, please login again.');
        await doReAuthenticate();

        throw refreshError;
      } finally {
        client.isRefreshing = false;
      }
    },
  };
};

/**
 * 状态码 → 错误文案（英文回落映射，与 vben 的 $t('ui.fallback.http.*') 键集合一致）。
 * 调用方可用 resolveStatusMessage / resolveNetworkMessage 注入 i18n 文案。
 */
const FALLBACK_STATUS_MESSAGES: Record<number, string> = {
  400: 'Bad request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  408: 'Request timeout',
};

export const errorMessageResponseInterceptor = (
  makeErrorMessage?: MakeErrorMessageFn,
  options?: {
    /**
     * HTTP 状态码 → 文案。返回 null/undefined = 该状态不提示（跳过 makeErrorMessage，
     * 供调用方做「仅 403/5xx 提示」等选择性策略）；返回空串 = 回落内置英文映射
     * （default 分支含 5xx 等）。
     */
    resolveStatusMessage?: (
      status: number | undefined,
    ) => string | null | undefined;
    /**
     * 网络/超时类错误文案：kind 'network'（Network Error）| 'timeout'（ECONNABORTED）。
     * 返回 null/undefined = 不提示；空串 = 回落内置英文映射。
     */
    resolveNetworkMessage?: (
      kind: 'network' | 'timeout',
    ) => string | null | undefined;
  },
): ResponseInterceptorConfig => {
  const { resolveNetworkMessage, resolveStatusMessage } = options ?? {};

  function fallbackStatusMessage(status: number | undefined): string {
    if (
      status !== undefined &&
      FALLBACK_STATUS_MESSAGES[status] !== undefined
    ) {
      return FALLBACK_STATUS_MESSAGES[status];
    }
    return 'Internal server error';
  }

  return {
    rejected: (error: any) => {
      if (axios.isCancel(error)) {
        return Promise.reject(error);
      }

      const err: string = error?.toString?.() ?? '';
      const isNetworkError = err?.includes('Network Error');
      const isTimeout =
        !isNetworkError && error?.message?.includes?.('timeout');
      if (isNetworkError || isTimeout) {
        if (resolveNetworkMessage) {
          // 注入方返回 null/undefined → 该错误不提示（与 resolveStatusMessage 同语义）；
          // 空串 = 回落内置英文映射
          const injected = isNetworkError
            ? resolveNetworkMessage('network')
            : resolveNetworkMessage('timeout');
          if (injected === null || injected === undefined) {
            return Promise.reject(error);
          }
          makeErrorMessage?.(
            injected ||
              (isNetworkError
                ? 'Network error, please check your connection'
                : 'Request timed out'),
            error,
          );
          return Promise.reject(error);
        }
        makeErrorMessage?.(
          isNetworkError
            ? 'Network error, please check your connection'
            : 'Request timed out',
          error,
        );
        return Promise.reject(error);
      }

      const status = error?.response?.status as number | undefined;
      if (resolveStatusMessage) {
        // 注入方返回 null/undefined → 该错误不提示（选择性通知策略）
        const injected = resolveStatusMessage(status);
        if (injected === null || injected === undefined) {
          return Promise.reject(error);
        }
        makeErrorMessage?.(injected || fallbackStatusMessage(status), error);
        return Promise.reject(error);
      }
      makeErrorMessage?.(fallbackStatusMessage(status), error);
      return Promise.reject(error);
    },
  };
};

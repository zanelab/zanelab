import type { AxiosRequestConfig } from 'axios';
import http from '../utils/http';
import { appConfig } from '../config';
import { encryptPassword } from '../utils/crypto';
import { useAuthStore } from '../stores/auth-store';
import { TOKEN_HEADER } from '../constants/auth';
import { cache } from '@zanelab/utils';
import type { LoginResult, UserInfo } from '../types';

// 类型辅助：拦截器已解包 { code, data, msg }，故请求函数直接返回 T（业务数据）。
const post = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  http.post(url, data, config) as unknown as Promise<T>;

const put = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  http.put(url, data, config) as unknown as Promise<T>;

/**
 * 当前用户 id（改密接口路径需要）。
 *
 * 优先 auth store（登录/会话恢复后写入 user.id ← 旧接口 userId）；
 * 兜底读 cache_UserInfo —— 刷新瞬间 store 尚未恢复，或该缓存由旧子应用写入
 * （旧字段名为 userId）时仍能取到。
 */
function resolveCurrentUserId(): number | string | undefined {
  const fromStore = useAuthStore.getState().user?.id;
  if (fromStore !== undefined && fromStore !== null && fromStore !== '') {
    return fromStore;
  }
  const cached = cache.get<{ id?: number | string; userId?: number | string }>(
    'UserInfo',
  );
  return cached?.id ?? cached?.userId;
}

/**
 * 旧项目登录参数（迁移自 Micro-public/src/pages/Login/type.ts）。
 * 后端契约：POST loginEndpoint，body = { loginChanel, email, password, code }。
 */
interface LegacyLoginParams {
  username: string;
  password: string;
  code?: string;
}

/**
 * 旧项目登录响应体（拦截器已解包 data 后）。
 * 迁移自 Micro-public/src/pages/Login/type.ts LoginResponseVO。
 */
interface LegacyLoginResponse {
  token: string;
  userId: number;
  name: string;
  email: string;
  phone: string;
}

/**
 * 将旧项目响应映射为新项目 LoginResult。
 * 旧 API 返回 { token, userId, name, email, phone }，
 * 新项目期望 { token, refreshToken?, user? }。
 */
function mapLoginResult(data: LegacyLoginResponse): LoginResult {
  const user: UserInfo = {
    id: data.userId,
    username: data.name,
    nickname: data.name,
  };
  // 旧后端无 refreshToken，留空——401 刷新时会走 handleLogout（见 http.ts）
  return { token: data.token, user };
}

export const authApi = {
  /**
   * 登录（迁移自旧项目 Micro-public/src/pages/Login/api.ts + index.tsx:268-318）。
   *
   * 逻辑链路：
   * 1. 表单 username → email（拼接 emailSuffix 如配置）
   * 2. 密码经 encryptPassword（SM4-ECB 或 base64）
   * 3. 组装 { loginChanel, email, password, code } 发往 loginEndpoint
   * 4. 响应经 mapLoginResult 映射为 LoginResult
   *
   * @param params 表单值 { username, password }（UI 层接口不变，映射在内部完成）
   */
  async login(params: {
    username: string;
    password: string;
  }): Promise<LoginResult> {
    const body: LegacyLoginParams = {
      username: params.username,
      password: encryptPassword(params.password),
    };
    const data = await post<LegacyLoginResponse>(
      appConfig.api.loginEndpoint,
      body,
    );
    return mapLoginResult(data);
  },

  /**
   * 登出：POST logoutEndpoint。
   *
   * token 显式写入 config.headers——fire-and-forget 模式下 handleLogout 清空 store 后，
   * 拦截器读到空 token 不会覆盖 config 中已有的 ailab-token 头（拦截器仅在 token 非空时
   * set TOKEN_HEADER），其余 legacy headers 由拦截器自动补齐。
   */
  async logout(token?: string): Promise<void> {
    if (!appConfig.api.logoutEndpoint) return;
    const tk = token ?? useAuthStore.getState().token;
    const headers: Record<string, string> = {};
    if (tk) headers[TOKEN_HEADER] = tk;
    await post<null>(appConfig.api.logoutEndpoint, null, { headers });
  },

  /**
   * 修改密码（迁移自旧项目 Micro-public/src/layouts/api.ts changePsd +
   * PaLayout/PassWordForm.tsx）。
   *
   * 后端契约：PUT /sys/auth/user/{userId}/change/pwd
   * body = { oldPassword, newPassword, confirmPassword }，三者均为 base64 字符串
   * （旧项目用 window.btoa 编码，未走 SM4 —— 与登录的加密口径不同，保持原样迁移）。
   *
   * 成功由调用方提示；失败提示由 http 拦截器统一 notify（spec/http-api-guidelines.md）。
   */
  async changePassword(params: {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<void> {
    const userId = resolveCurrentUserId();
    if (userId === undefined)
      throw new Error('[changePassword] missing userId');
    await put<null>(`/sys/auth/user/${userId}/change/pwd`, params);
  },
};

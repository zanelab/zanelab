import type { AxiosRequestConfig } from 'axios';
import http from '../utils/http';
import { appConfig } from '../config';
import { supabase } from '../lib/supabase';
import type { Session } from '../lib/supabase';
import type { UserInfo } from '../types';

const post = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  http.post(url, data, config) as unknown as Promise<T>;
const get = <T>(url: string, config?: AxiosRequestConfig) =>
  http.get(url, config) as unknown as Promise<T>;
const put = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  http.put(url, data, config) as unknown as Promise<T>;

export interface SupabaseLoginParams {
  email: string;
  password: string;
}

export async function supabaseLogin(params: SupabaseLoginParams): Promise<{
  session: Session;
  user: UserInfo;
}> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.session || !data.user) {
    throw new Error('登录失败：未获取到会话信息');
  }

  const user: UserInfo = {
    id: data.user.id,
    username: data.user.email ?? '',
    nickname:
      (data.user.user_metadata as Record<string, string> | undefined)
        ?.nickname ??
      data.user.email ??
      '',
  };

  return { session: data.session, user };
}

export async function supabaseSignOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.warn('[supabaseSignOut] sign out error:', error.message);
  }
}

interface UserOrgVO {
  orgId: number;
  orgCode: string;
  orgName: string;
  isDefault: boolean;
}

interface UserTenantPerVO {
  tenantId: number;
  tenantCode: string;
  tenantName: string;
  isDefault: boolean;
  isPerm: boolean;
  orgList: UserOrgVO[];
  username: string;
}

interface UserPerVO {
  isPlatform: boolean;
  tenantList: UserTenantPerVO[];
}

export const authApi = {
  async login(params: { username?: string; password?: string }): Promise<{
    token: string;
    refreshToken?: string;
    user?: UserInfo;
  }> {
    const { session, user } = await supabaseLogin({
      email: params.username ?? '',
      password: params.password ?? '',
    });
    return {
      token: session.access_token,
      refreshToken: session.refresh_token,
      user,
    };
  },

  async logout(_token?: string): Promise<void> {
    await supabaseSignOut();
  },

  async changePassword(params: {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('[changePassword] missing user');
    await put<null>(`/sys/auth/user/${user.id}/change/pwd`, params);
  },

  async sendOtpEmail(email: string): Promise<boolean> {
    if (!appConfig.api.otpEndpoint) return false;
    await post<null>(appConfig.api.otpEndpoint, { email });
    return true;
  },

  async getUserPer(): Promise<UserPerVO | null> {
    try {
      return await get<UserPerVO>(appConfig.api.userPerEndpoint);
    } catch (e) {
      console.warn('[getUserPer] failed:', e);
      return null;
    }
  },

  async findPowerAgent(): Promise<unknown> {
    try {
      return await get<unknown>(appConfig.api.powerAgentEndpoint, {
        baseURL: appConfig.api.agentBaseURL,
      });
    } catch (e) {
      console.warn('[findPowerAgent] failed:', e);
      return null;
    }
  },
};

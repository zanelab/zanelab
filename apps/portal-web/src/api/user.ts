import http from '../utils/http';
import { appConfig } from '../config';
import type { UserInfo } from '../types';

export async function fetchUserInfo(): Promise<UserInfo> {
  return http.get(
    appConfig.api.userInfoEndpoint,
  ) as unknown as Promise<UserInfo>;
}

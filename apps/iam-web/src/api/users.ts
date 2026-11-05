/*
 * iam-web 用户域 api —— `/functions/v1` 调用的第三域（auth/menus 之外）。
 *
 * 形态与 api/auth.ts / api/menus.ts 完全一致：命名空间对象，层内完成 URL 拼装、
 * 响应归一化与错误语义；路径常量进 api/endpoints.ts。鉴权头由传输层注入
 * （集成态宿主拦截器 / 独立态本地客户端），本层不感知身份。
 *
 * 数据源：Supabase auth.users（Edge Fn 经 supabaseAdmin 查询，publishable 不可见）
 * + user_roles/roles 角色聚合。写操作（角色分配/禁用）admin-only。
 */
import { getProps } from '../props';
import { get, put } from '../utils/http';
import { USERS_LIST_PATH, USER_ROLES_PATH, USER_BAN_PATH } from './endpoints';

/** 用户行（Edge Fn /auth/users 出参）。 */
export interface UserRecord {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  /** 角色编码列表（'admin' / 'guest'） */
  roles: string[];
}

/** 集成态 basename('/iam') → 代理前缀 '/iam'；独立态（缺省）→ ''（同 auth/menus 域）。 */
function apiPrefix(): string {
  return (getProps().basename as string | undefined)?.replace(/\/$/, '') ?? '';
}

/** 双形态读值（解包优先，envelope 兜底）——与 auth/menus 域同一助手语义。 */
function normalize<T>(res: unknown): T | undefined {
  return ((res as { data?: T } | undefined)?.data ?? res) as T | undefined;
}

/** 后端文案提取（四级 + 顶层 msg，同 auth/menus 域）。 */
function extractMsg(error: unknown): string | undefined {
  const e = error as
    | {
        response?: { data?: { msg?: string } };
        data?: { msg?: string };
        msg?: string;
        message?: string;
      }
    | undefined;
  return (
    e?.response?.data?.msg ?? e?.data?.msg ?? e?.msg ?? e?.message ?? undefined
  );
}

/** 失败统一上抛：Error(msg)；msg 取不到 → 无 message 的 Error（页面落 i18n 兜底）。 */
function toError(error: unknown): Error {
  return new Error(extractMsg(error));
}

export const usersApi = {
  /** 用户列表：GET {prefix}{USERS_LIST_PATH}（admin-only；403 时 msg 透出）。 */
  async list(): Promise<UserRecord[]> {
    let res: unknown;
    try {
      res = await get(`${apiPrefix()}${USERS_LIST_PATH}`);
    } catch (e) {
      throw toError(e);
    }
    const data = normalize<UserRecord[]>(res);
    if (Array.isArray(data)) return data;
    const envelope = res as { msg?: string } | undefined;
    throw new Error(envelope?.msg);
  },

  /** 角色分配：PUT {prefix}{USER_ROLES_PATH(id)}，全量替换（admin-only）。 */
  async assignRoles(id: string, roles: string[]): Promise<void> {
    let res: unknown;
    try {
      res = await put(`${apiPrefix()}${USER_ROLES_PATH(id)}`, { roles });
    } catch (e) {
      throw toError(e);
    }
    const data = normalize<{ id?: string }>(res);
    if (data && typeof data === 'object' && 'id' in data) return;
    throw new Error((data as { msg?: string } | undefined)?.msg);
  },

  /** 禁用/恢复：PUT {prefix}{USER_BAN_PATH(id)}（admin-only；自禁 → 1015）。 */
  async setBanned(id: string, disabled: boolean): Promise<void> {
    let res: unknown;
    try {
      res = await put(`${apiPrefix()}${USER_BAN_PATH(id)}`, { disabled });
    } catch (e) {
      throw toError(e);
    }
    const data = normalize<{ id?: string }>(res);
    if (data && typeof data === 'object' && 'id' in data) return;
    throw new Error((data as { msg?: string } | undefined)?.msg);
  },
};

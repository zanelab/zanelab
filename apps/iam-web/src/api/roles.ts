/*
 * iam-web 角色域 api —— `/functions/v1` 调用的第四域（auth/menus/users 之外）。
 *
 * 形态与其它域一致：命名空间对象，URL 拼装 + 响应归一化 + 错误语义；路径常量进
 * endpoints.ts。鉴权头由传输层注入，本层不感知身份（角色端点 admin-only，403 透出）。
 */
import { getProps } from '../props';
import { get, put } from '../utils/http';
import { ROLES_LIST_PATH, ROLE_PERMISSIONS_PATH } from './endpoints';

/** 角色行（Edge Fn /auth/roles 出参）。 */
export interface RoleRecord {
  id: number;
  code: string;
  name: string;
  /** 授权菜单 code 数量（'*' 记 1） */
  permissionCount: number;
}

function apiPrefix(): string {
  return (getProps().basename as string | undefined)?.replace(/\/$/, '') ?? '';
}

function normalize<T>(res: unknown): T | undefined {
  return ((res as { data?: T } | undefined)?.data ?? res) as T | undefined;
}

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

function toError(error: unknown): Error {
  return new Error(extractMsg(error));
}

export const rolesApi = {
  /** 角色列表（admin-only）。 */
  async list(): Promise<RoleRecord[]> {
    let res: unknown;
    try {
      res = await get(`${apiPrefix()}${ROLES_LIST_PATH}`);
    } catch (e) {
      throw toError(e);
    }
    const data = normalize<RoleRecord[]>(res);
    if (Array.isArray(data)) return data;
    throw new Error((res as { msg?: string } | undefined)?.msg);
  },

  /** 角色已授权 code 集合（string[]；admin 的 '*' 也在其中）。 */
  async getPermissions(roleId: number): Promise<string[]> {
    let res: unknown;
    try {
      res = await get(`${apiPrefix()}${ROLE_PERMISSIONS_PATH(roleId)}`);
    } catch (e) {
      throw toError(e);
    }
    const data = normalize<string[]>(res);
    if (Array.isArray(data)) return data;
    throw new Error((res as { msg?: string } | undefined)?.msg);
  },

  /** 全量替换授权（body { permissions: string[] }）。 */
  async savePermissions(roleId: number, permissions: string[]): Promise<void> {
    let res: unknown;
    try {
      res = await put(`${apiPrefix()}${ROLE_PERMISSIONS_PATH(roleId)}`, {
        permissions,
      });
    } catch (e) {
      throw toError(e);
    }
    const data = normalize<{ id?: number }>(res);
    if (data && typeof data === 'object' && 'id' in data) return;
    throw new Error((data as { msg?: string } | undefined)?.msg);
  },
};

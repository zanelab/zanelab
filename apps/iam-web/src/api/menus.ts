/*
 * iam-web 菜单域 api —— `/functions/v1` 调用的第二域（auth 之外的首个业务域）。
 *
 * 形态与 api/auth.ts 完全一致：命名空间对象，层内完成 URL 拼装、响应归一化与
 * 错误语义；路径常量进 api/endpoints.ts。鉴权头由传输层注入（集成态宿主拦截器 /
 * 独立态本地客户端的 Bearer 逻辑），本层不感知身份。
 *
 * MenuItemRecord 对齐旧项目 RawMenuItem 契约（13 字段）——portal 侧同名类型是
 * 私有实现不导出，且 apps 间禁止互相 import，故在此按契约复制定义
 * （apps/portal-web/src/api/menu.ts:8-25，字段语义以其注释为准）。
 * 宿主 fetchMenus 将来切数据源时 transformMenu 无需改动。
 */
import { getProps } from '../props';
import { post, get, put, del } from '../utils/http';
import {
  MENUS_LIST_PATH,
  MENUS_COLLECTION_PATH,
  MENUS_ITEM_PATH,
} from './endpoints';

/** 菜单节点（任务 11-04 修订契约：初始化迁移 0001 的 menus 表列集）。 */
export interface MenuItemRecord {
  id: number;
  pid: number | null;
  code: string;
  name: string;
  component: string | null;
  uri: string | null;
  type: 'app' | 'menu' | 'button' | 'group';
  sort: number;
  icon: string | null;
  activeIcon: string | null; // snake_case active_icon 经归一化转 camelCase
  hidden: boolean;
  scopes: ('A' | 'C')[]; // 适用范围：A=管理端 C=客户端（含 C 即游客可见）
  children?: MenuItemRecord[] | null;
}

/** 菜单管理页可写的字段集合（id/pid/parent/created_at 由服务端管理）。 */
export interface MenuInput {
  pid?: number | null;
  code: string;
  name: string;
  component?: string | null;
  uri?: string | null;
  type: MenuItemRecord['type'];
  sort?: number;
  icon?: string | null;
  activeIcon?: string | null;
  hidden?: boolean;
  scopes?: ('A' | 'C')[];
}

/** 集成态 basename('/iam') → 代理前缀 '/iam'；独立态（缺省）→ ''（同 api/auth.ts）。 */
function apiPrefix(): string {
  return (getProps().basename as string | undefined)?.replace(/\/$/, '') ?? '';
}

/** 双形态读值（解包优先，envelope 兜底）——与 auth 域同一助手语义。 */
function normalize<T>(res: unknown): T | undefined {
  return ((res as { data?: T } | undefined)?.data ?? res) as T | undefined;
}

/** 后端文案提取（四级顺序，同 auth 域）。 */
function extractMsg(error: unknown): string | undefined {
  const e = error as
    | {
        response?: { data?: { msg?: string } };
        data?: { msg?: string };
        /** RequestClient.request 的 catch 对 4xx 直接重抛 error.response.data
         * （envelope 本体）——msg 就在顶层（request-client.ts 的 throw 形态） */
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

/** 服务端 snake_case（active_icon）→ 前端 camelCase（activeIcon），递归子树。
 *  入参用宽松形态（服务端原始行可能带 active_icon），出参收敛到 MenuItemRecord。 */
type RawMenuNode = Omit<MenuItemRecord, 'activeIcon' | 'children'> & {
  active_icon?: string | null;
  children?: RawMenuNode[] | null;
};

function mapActiveIcon(nodes: RawMenuNode[]): MenuItemRecord[] {
  return nodes.map(({ active_icon, children, ...rest }) => ({
    ...rest,
    activeIcon: active_icon ?? null,
    children: children?.length ? mapActiveIcon(children) : null,
  }));
}

export const menusApi = {
  /**
   * 菜单树：GET {prefix}{MENUS_LIST_PATH}。
   *
   * 返回 children 嵌套树（RawMenuItem 形状）；身份差异（游客子集 / 权限过滤 /
   * admin 全量）由服务端判定（design DD3），本层不区分。
   */
  async list(): Promise<MenuItemRecord[]> {
    let res: unknown;
    try {
      res = await get(`${apiPrefix()}${MENUS_LIST_PATH}`);
    } catch (e) {
      throw toError(e);
    }
    const data = normalize<MenuItemRecord[]>(res);
    // 成功时 data 是数组；非数组（异常 envelope 未解包等）按失败上抛
    if (Array.isArray(data)) return mapActiveIcon(data);
    const envelope = res as { msg?: string } | undefined;
    throw new Error(envelope?.msg);
  },

  /** 新建：POST {prefix}{MENUS_COLLECTION_PATH}，仅 admin（403 时 msg 透出）。 */
  async create(input: MenuInput): Promise<MenuItemRecord> {
    let res: unknown;
    try {
      res = await post(`${apiPrefix()}${MENUS_COLLECTION_PATH}`, input);
    } catch (e) {
      throw toError(e);
    }
    const data = normalize<MenuItemRecord>(res);
    if (data && typeof data === 'object' && 'id' in data)
      return mapActiveIcon([data])[0];
    throw new Error((data as { msg?: string } | undefined)?.msg);
  },

  /** 更新：PUT {prefix}{MENUS_ITEM_PATH(id)}，仅 admin。 */
  async update(id: number, input: Partial<MenuInput>): Promise<MenuItemRecord> {
    let res: unknown;
    try {
      res = await put(`${apiPrefix()}${MENUS_ITEM_PATH(id)}`, input);
    } catch (e) {
      throw toError(e);
    }
    const data = normalize<MenuItemRecord>(res);
    if (data && typeof data === 'object' && 'id' in data)
      return mapActiveIcon([data])[0];
    throw new Error((data as { msg?: string } | undefined)?.msg);
  },

  /**
   * 删除：DELETE {prefix}{MENUS_ITEM_PATH(id)}，仅 admin。
   * 级联子树由数据库 FK on delete cascade 完成（design DD1）。
   */
  async remove(id: number): Promise<void> {
    let res: unknown;
    try {
      res = await del(`${apiPrefix()}${MENUS_ITEM_PATH(id)}`);
    } catch (e) {
      throw toError(e);
    }
    const data = normalize<{ id?: number }>(res);
    if (data && typeof data === 'object' && 'id' in data) return;
    throw new Error((data as { msg?: string } | undefined)?.msg);
  },
};

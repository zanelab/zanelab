/*
 * skills-web 技能域 api —— `/functions/v1/skills` 调用的业务域（首个业务域）。
 *
 * 形态与 iam-web api/menus.ts 完全一致：命名空间对象，层内完成 URL 拼装、
 * 响应归一化与错误语义；路径常量进 api/endpoints.ts。鉴权头由传输层注入
 * （集成态宿主拦截器 / 独立态本地客户端），本层不感知身份。
 *
 * 契约（.trellis/tasks/11-23-skills-crud-mock/prd.md 接口规划）：
 * - envelope { code, data, msg }，code 0 成功（传输层已解包，本层拿 data）
 * - GET 集合/详情匿名可调；POST/PUT/DELETE 无 JWT → 401、无权限码 → 403
 * - 入参/出参 camelCase（**新接口无历史包袱，契约定死 camel**——DB 列
 *   snake_case 由 edge fn 内映射，与 iam menus 的「双形态兼容」不同）
 * - 失败统一上抛 Error(msg)；msg 取不到 → 无 message 的 Error（页面落 i18n 兜底）
 */
import { post, get, put, del } from '../utils/http';
import { apiPrefix } from './prefix';
import { SKILLS_COLLECTION_PATH, SKILLS_ITEM_PATH } from './endpoints';

/** 技能记录（接口契约，对齐页面 SkillItem；数组/枚举值域见 data.ts）。 */
export interface SkillRecord {
  id: number;
  title: string;
  free: boolean;
  featured: boolean;
  /** 输出类型值域（'网页'|'幻灯片'|'视频'|'图像'——中文值是数据键） */
  outputTypes: string[];
  roles: string[];
  scenes: string[];
  downloads: number;
  bookmarks: number;
  /** 1–5 整数 */
  rating: number;
  /** 'primary'|'secondary'|'accent'|'info'|'success'|'warning' */
  tone: string;
  /** Agent 缩写数组（CC/CX/AG/CU） */
  agents: string[];
  createdAt: string;
  updatedAt: string;
}

/** POST/PUT 可写字段（id/createdAt/updatedAt 由服务端管理；PUT 部分更新语义）。 */
export interface SkillInput {
  title?: string;
  free?: boolean;
  featured?: boolean;
  outputTypes?: string[];
  roles?: string[];
  scenes?: string[];
  downloads?: number;
  bookmarks?: number;
  rating?: number;
  tone?: string;
  agents?: string[];
}

/** 服务端行（snake_case）→ 前端契约（camelCase），递归无子树（平表）。 */
type RawSkillRow = Omit<
  SkillRecord,
  'outputTypes' | 'createdAt' | 'updatedAt'
> & {
  output_types?: string[];
  created_at?: string;
  updated_at?: string;
};

function mapRow(rows: RawSkillRow[]): SkillRecord[] {
  return rows.map(
    ({ output_types, created_at, updated_at, ...rest }) =>
      ({
        ...rest,
        outputTypes: output_types ?? [],
        createdAt: created_at ?? '',
        updatedAt: updated_at ?? '',
      }) as SkillRecord,
  );
}

/** 失败统一上抛：Error(msg)；msg 取不到 → 无 message 的 Error（页面落 i18n 兜底）。 */
function toError(error: unknown): Error {
  const e = error as
    | {
        response?: { data?: { msg?: string } };
        data?: { msg?: string };
        /** RequestClient.request 的 catch 对 4xx 直接重抛 error.response.data
         *  （envelope 本体）——msg 就在顶层 */
        msg?: string;
        message?: string;
      }
    | undefined;
  return new Error(
    e?.response?.data?.msg ?? e?.data?.msg ?? e?.msg ?? e?.message ?? undefined,
  );
}

/** 单条/集合响应归一：成功形态收敛到 SkillRecord；非数组/缺 id 按失败上抛。 */
function normalizeOne(res: unknown): SkillRecord {
  const data = res as RawSkillRow | { msg?: string } | undefined;
  if (data && typeof data === 'object' && 'id' in data) {
    return mapRow([data as RawSkillRow])[0];
  }
  throw new Error((data as { msg?: string } | undefined)?.msg);
}

export const skillsApi = {
  /** 技能全量列表（GET，匿名可调——公开读，父任务决策 D1）。 */
  async list(): Promise<SkillRecord[]> {
    let res: unknown;
    try {
      res = await get(`${apiPrefix()}${SKILLS_COLLECTION_PATH}`);
    } catch (e) {
      throw toError(e);
    }
    if (Array.isArray(res)) return mapRow(res as RawSkillRow[]);
    throw new Error((res as { msg?: string } | undefined)?.msg);
  },

  /** 单条详情（GET，匿名可调；编辑表单回填）。不存在 → 404 msg 透出。 */
  async get(id: number): Promise<SkillRecord> {
    let res: unknown;
    try {
      res = await get(`${apiPrefix()}${SKILLS_ITEM_PATH(id)}`);
    } catch (e) {
      throw toError(e);
    }
    return normalizeOne(res);
  },

  /** 新建（POST，require skills:skill:create；无 JWT 401 / 无码 403 msg 透出）。 */
  async create(input: SkillInput): Promise<SkillRecord> {
    let res: unknown;
    try {
      res = await post(`${apiPrefix()}${SKILLS_COLLECTION_PATH}`, input);
    } catch (e) {
      throw toError(e);
    }
    return normalizeOne(res);
  },

  /** 更新（PUT，require skills:skill:update；部分更新语义——未传字段不动）。 */
  async update(id: number, input: SkillInput): Promise<SkillRecord> {
    let res: unknown;
    try {
      res = await put(`${apiPrefix()}${SKILLS_ITEM_PATH(id)}`, input);
    } catch (e) {
      throw toError(e);
    }
    return normalizeOne(res);
  },

  /** 删除（DELETE，require skills:skill:delete）。不存在 → 404 msg 透出。 */
  async remove(id: number): Promise<void> {
    let res: unknown;
    try {
      res = await del(`${apiPrefix()}${SKILLS_ITEM_PATH(id)}`);
    } catch (e) {
      throw toError(e);
    }
    const data = res as { id?: number } | undefined;
    if (data && typeof data === 'object' && 'id' in data) return;
    throw new Error((res as { msg?: string } | undefined)?.msg);
  },
};

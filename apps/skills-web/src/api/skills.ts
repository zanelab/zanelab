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
import i18n from '../locales/i18n';

/** 技能记录（接口契约，对齐页面 SkillItem；数组/枚举值域见 data.ts）。
 *
 * 详情页字段（任务 11-24-skills-detail-schema）：version/summary/description/
 * taskExpression/价格三态/统计/JSONB 内容结构/标签四桶/兼容能力列。
 * 新字段全为可选——旧消费方（列表页 record.ts）不受影响。 */
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
  /** 1–5 整数（作者自评） */
  rating: number;
  /** 'primary'|'secondary'|'accent'|'info'|'success'|'warning' */
  tone: string;
  /** Agent 缩写数组（CC/CX/AG/CU） */
  agents: string[];
  createdAt: string;
  updatedAt: string;
  // —— 详情页字段（11-24，可选）——
  /** 语义化版本（如 '1.0.1'） */
  version?: string;
  /** 一句话用途（基线语言） */
  taskExpression?: string;
  /** 卡片/采集卡描述（基线语言） */
  summary?: string;
  /** 详情长描述（基线语言） */
  description?: string;
  /** 定价三态 */
  priceKind?: 'free' | 'paid' | 'requires_key';
  priceAmount?: number | null;
  priceNote?: string;
  requiresApiKey?: string[];
  /** 喜欢数 */
  likes?: number;
  /** 用户评分均值（1 位小数；null = 无评分） */
  score?: number | null;
  reviewsCount?: number;
  /** 媒体画廊 */
  media?: SkillMedia[];
  /** 演示示例（prompt + 成品） */
  demoExamples?: SkillDemo[];
  /** 交付清单（What you get） */
  deliverables?: string[];
  /** 适合人群 */
  goodFit?: string[];
  /** 不适用场景 */
  notFor?: string[];
  /** 准备事项四段 */
  requirements?: SkillRequirements;
  /** 标签四桶（scenarios/tasks/highlights 存 i18n key；styles 存原文不译） */
  tags?: SkillTags;
  /** 驱动模型 */
  generatesWith?: string[];
  /** 外部工具 */
  usesTools?: string[];
  /** 在线试用地址（web 类） */
  tryOnlineUrl?: string;
}

/** 媒体项（画廊/演示示例共用）。 */
export interface SkillMedia {
  kind: 'image' | 'video';
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  /** 排序（小的在前；视频可排首位） */
  order?: number;
}

/** 演示示例：用户 prompt + 成品媒体。 */
export interface SkillDemo {
  prompt: string;
  mediaUrl?: string;
  mediaKind?: 'image' | 'video';
  caption?: string;
}

/** 准备事项四段（参考站：You bring / Dependencies / Outside costs / Last tested）。 */
export interface SkillRequirements {
  bring?: string[];
  dependencies?: string[];
  outsideCosts?: string[];
  lastTested?: string;
}

/** 标签四桶：前三类存 i18n key（渲染期 t() 解析）；styles 存原文不译。 */
export interface SkillTags {
  scenarios?: string[];
  tasks?: string[];
  highlights?: string[];
  styles?: string[];
}

/** i18n 译文载荷（locale → 四字段；字段缺省/null = 回落基线）。 */
export interface SkillI18nInput {
  [locale: string]: {
    title?: string | null;
    summary?: string | null;
    description?: string | null;
    taskExpression?: string | null;
  };
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
  // —— 详情页字段（11-24）——
  version?: string;
  taskExpression?: string;
  summary?: string;
  description?: string;
  priceKind?: 'free' | 'paid' | 'requires_key';
  priceAmount?: number | null;
  priceNote?: string;
  requiresApiKey?: string[];
  likes?: number;
  score?: number | null;
  reviewsCount?: number;
  media?: SkillMedia[];
  demoExamples?: SkillDemo[];
  deliverables?: string[];
  goodFit?: string[];
  notFor?: string[];
  requirements?: SkillRequirements;
  tags?: SkillTags;
  generatesWith?: string[];
  usesTools?: string[];
  tryOnlineUrl?: string;
  /** 译文载荷（locale → 字段；不传 = 不动副表） */
  i18n?: SkillI18nInput;
}

/** 服务端行（snake_case）→ 前端契约（camelCase），递归无子树（平表）。 */
type RawSkillRow = Omit<
  SkillRecord,
  | 'outputTypes'
  | 'createdAt'
  | 'updatedAt'
  | 'taskExpression'
  | 'priceKind'
  | 'priceAmount'
  | 'requiresApiKey'
  | 'reviewsCount'
  | 'demoExamples'
  | 'goodFit'
  | 'notFor'
  | 'generatesWith'
  | 'usesTools'
  | 'tryOnlineUrl'
> & {
  output_types?: string[];
  created_at?: string;
  updated_at?: string;
  task_expression?: string;
  price_kind?: 'free' | 'paid' | 'requires_key';
  price_amount?: number | null;
  requires_api_key?: string[];
  reviews_count?: number;
  demo_examples?: SkillDemo[];
  good_fit?: string[];
  not_for?: string[];
  generates_with?: string[];
  uses_tools?: string[];
  try_online_url?: string;
};

function mapRow(rows: RawSkillRow[]): SkillRecord[] {
  return rows.map(
    ({
      output_types,
      created_at,
      updated_at,
      task_expression,
      price_kind,
      price_amount,
      requires_api_key,
      reviews_count,
      demo_examples,
      good_fit,
      not_for,
      generates_with,
      uses_tools,
      try_online_url,
      ...rest
    }) =>
      ({
        ...rest,
        outputTypes: output_types ?? [],
        createdAt: created_at ?? '',
        updatedAt: updated_at ?? '',
        taskExpression: task_expression ?? '',
        priceKind: price_kind ?? 'free',
        priceAmount: price_amount ?? null,
        requiresApiKey: requires_api_key ?? [],
        reviewsCount: reviews_count ?? 0,
        demoExamples: demo_examples ?? [],
        goodFit: good_fit ?? [],
        notFor: not_for ?? [],
        generatesWith: generates_with ?? [],
        usesTools: uses_tools ?? [],
        tryOnlineUrl: try_online_url ?? '',
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

  /** 单条详情（GET，匿名可调；编辑表单回填）。不存在 → 404 msg 透出。
   *
   * locale（可选）：传则请求副表译文（命中覆盖、缺失回落基线）；缺省不带
   * ——列表/编辑回填用基线即可。locale 取自 i18n 运行时（当前语言），不硬编码。 */
  async get(id: number, locale?: string): Promise<SkillRecord> {
    let res: unknown;
    try {
      const query = locale ? `?locale=${encodeURIComponent(locale)}` : '';
      res = await get(`${apiPrefix()}${SKILLS_ITEM_PATH(id)}${query}`);
    } catch (e) {
      throw toError(e);
    }
    return normalizeOne(res);
  },

  /** 当前语言（i18n 运行时实例的 language）——详情取译文的默认 locale。 */
  currentLocale(): string {
    return i18n.language || 'zh-CN';
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

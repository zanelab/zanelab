import { delay, http, HttpResponse } from 'msw';
import {
  INTEGRATION_PREFIX,
  SKILLS_COLLECTION_PATH,
  SKILLS_ITEM_PATH,
} from '../api/endpoints';
/** Edge fn 响应行形态（snake_case 原样透传，镜像 DB 列）；api 层负责归一。 */
interface RawSkillRow {
  id: number;
  title: string;
  free: boolean;
  featured: boolean;
  output_types: string[];
  roles: string[];
  scenes: string[];
  downloads: number;
  bookmarks: number;
  rating: number;
  tone: string;
  agents: string[];
  created_at: string;
  updated_at: string;
}
import { can, resolvePermissions } from './auth';

/*
 * skills-web 技能 mock handler（本应用接口的 mock 契约）。
 *
 * 契约 = skills Edge Fn（apps/skills-web/supabase/functions/skills/index.ts）：
 * - envelope { code, data, msg }，code 0 成功
 * - GET    /skills      → 全量列表（匿名可调，公开读）
 * - GET    /skills/:id  → 单条（匿名可调；不存在 1013/404）
 * - POST   /skills      → 新建（skills:skill:create；无 JWT 1010/401、无码 1011/403）
 * - PUT    /skills/:id  → 更新（skills:skill:update；含 updated_at 服务端管理语义）
 * - DELETE /skills/:id  → 删除（skills:skill:delete；不存在 1013/404）
 * - 校验：title 必填、rating 1–5 整数、tone 枚举 → 1014
 *
 * 身份模拟（iam-web src/mocks/auth.ts 同款）：handler 读 Authorization 头——
 * - 无 Authorization：匿名 → 读 200 / 写 403
 * - Bearer mock-skills-editor：写码持有者 → 写放行
 * - Bearer mock-admin：admin('*') → 全放行
 * 独立态切换身份：devtools 里 localStorage.iam_token = 'mock-admin' 后刷新。
 *
 * 种子：与 skills-web supabase/migrations/0002_seed_skills.sql 同源（14 条，
 * 字段值逐条对齐）——mock 内存态与 DB 种子呈现一致；内存态无持久化，刷新回种子。
 *
 * 路径派生：iam menu-handlers 同模式（pagePaths），常量来自 api/endpoints.ts，
 * 路径漂移在结构上不可能。
 */

/** 集成态页面 fetch 带 /skills 前缀（SW 拦截在宿主 proxy rewrite 之前），两种路径形态都登记。 */
const pagePaths = (p: string) => [p, `${INTEGRATION_PREFIX}${p}`];

/** 与 0002 种子同源（字段逐条对齐；id 模拟 identity 从 1 起）。 */
const seedSkills: RawSkillRow[] = [
  {
    id: 1,
    title: '薄荷暗夜软件产品官网',
    free: true,
    featured: false,
    output_types: ['网页'],
    roles: ['创始人', '设计师'],
    scenes: ['品牌建立与视觉规范'],
    downloads: 340,
    bookmarks: 6,
    rating: 5,
    tone: 'primary',
    agents: ['CC', 'CX', 'AG', 'CU'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-10T00:00:00Z',
  },
  {
    id: 2,
    title: '橙焙电单车商店',
    free: true,
    featured: false,
    output_types: ['网页', '图像'],
    roles: ['电商卖家'],
    scenes: ['社交内容与营销活动', '内容与编辑发布'],
    downloads: 241,
    bookmarks: 8,
    rating: 5,
    tone: 'warning',
    agents: ['CC', 'CX', 'AG', 'CU'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-08T00:00:00Z',
  },
  {
    id: 3,
    title: '清新绿药房商店',
    free: true,
    featured: false,
    output_types: ['网页'],
    roles: ['电商卖家'],
    scenes: ['社交内容与营销活动'],
    downloads: 209,
    bookmarks: 7,
    rating: 4,
    tone: 'success',
    agents: ['CC', 'CX', 'AG', 'CU'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-05T00:00:00Z',
  },
  {
    id: 4,
    title: '贴纸闪赠礼应用网站',
    free: true,
    featured: false,
    output_types: ['网页', '图像'],
    roles: ['设计师', '内容创作者'],
    scenes: ['品牌建立与视觉规范', '社交内容与营销活动'],
    downloads: 207,
    bookmarks: 5,
    rating: 5,
    tone: 'secondary',
    agents: ['CC', 'CX', 'AG', 'CU'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  },
  {
    id: 5,
    title: '马克笔涂鸦品牌工作室',
    free: true,
    featured: false,
    output_types: ['网页', '图像'],
    roles: ['设计师', '创始人'],
    scenes: ['品牌建立与视觉规范'],
    downloads: 186,
    bookmarks: 7,
    rating: 4,
    tone: 'accent',
    agents: ['CC', 'CX', 'AG', 'CU'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-10-28T00:00:00Z',
  },
  {
    id: 6,
    title: '轨道协作落地站',
    free: true,
    featured: false,
    output_types: ['网页'],
    roles: ['创始人', '营销人员'],
    scenes: ['内容与编辑发布'],
    downloads: 203,
    bookmarks: 2,
    rating: 4,
    tone: 'info',
    agents: ['CC', 'CX', 'AG', 'CU'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-10-25T00:00:00Z',
  },
  {
    id: 7,
    title: '黑白设计师作品集',
    free: true,
    featured: false,
    output_types: ['网页'],
    roles: ['设计师'],
    scenes: ['品牌建立与视觉规范'],
    downloads: 184,
    bookmarks: 4,
    rating: 5,
    tone: 'primary',
    agents: ['CC', 'CX', 'AG', 'CU'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-10-21T00:00:00Z',
  },
  {
    id: 8,
    title: '青柠边框设计师作品集',
    free: true,
    featured: false,
    output_types: ['网页'],
    roles: ['设计师', '研究人员'],
    scenes: ['品牌建立与视觉规范'],
    downloads: 178,
    bookmarks: 6,
    rating: 4,
    tone: 'secondary',
    agents: ['CC', 'CX', 'AG', 'CU'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-10-18T00:00:00Z',
  },
  {
    id: 9,
    title: '方格纸饮品品牌网站',
    free: true,
    featured: false,
    output_types: ['网页'],
    roles: ['创始人', '营销人员'],
    scenes: ['社交内容与营销活动'],
    downloads: 177,
    bookmarks: 4,
    rating: 4,
    tone: 'warning',
    agents: ['CC', 'CX', 'AG', 'CU'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-10-15T00:00:00Z',
  },
  {
    id: 10,
    title: '宝蓝宠物用品商店',
    free: true,
    featured: false,
    output_types: ['网页', '图像'],
    roles: ['电商卖家'],
    scenes: ['社交内容与营销活动', '内容与编辑发布'],
    downloads: 176,
    bookmarks: 4,
    rating: 5,
    tone: 'primary',
    agents: ['CC', 'CX', 'AG', 'CU'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-10-12T00:00:00Z',
  },
  {
    id: 11,
    title: '融资路演幻灯片生成',
    free: false,
    featured: true,
    output_types: ['幻灯片'],
    roles: ['创始人', '顾问'],
    scenes: ['知识解释与教学', '内容与编辑发布'],
    downloads: 452,
    bookmarks: 31,
    rating: 5,
    tone: 'info',
    agents: ['CC', 'CX'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-11T00:00:00Z',
  },
  {
    id: 12,
    title: '短视频产品口播脚本',
    free: false,
    featured: true,
    output_types: ['视频'],
    roles: ['营销人员', '内容创作者'],
    scenes: ['社交内容与营销活动', '内容与编辑发布'],
    downloads: 388,
    bookmarks: 22,
    rating: 4,
    tone: 'secondary',
    agents: ['CC', 'AG'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-09T00:00:00Z',
  },
  {
    id: 13,
    title: '品牌插画批量生成',
    free: true,
    featured: false,
    output_types: ['图像'],
    roles: ['设计师', '内容创作者'],
    scenes: ['品牌建立与视觉规范'],
    downloads: 301,
    bookmarks: 15,
    rating: 4,
    tone: 'accent',
    agents: ['CC', 'CX', 'CU'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-03T00:00:00Z',
  },
  {
    id: 14,
    title: '课堂教学课件助手',
    free: true,
    featured: false,
    output_types: ['幻灯片'],
    roles: ['教师', '研究人员'],
    scenes: ['知识解释与教学'],
    downloads: 156,
    bookmarks: 9,
    rating: 5,
    tone: 'success',
    agents: ['CC'],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-10-30T00:00:00Z',
  },
];

let skills: RawSkillRow[] = structuredClone(seedSkills);
let nextId = 1000;

/** 测试复位：恢复种子（api 层测试 afterEach 调用；iam menu-handlers 同款）。 */
export function resetSkillMock(): void {
  skills = structuredClone(seedSkills);
  nextId = 1000;
}

const ok = (data: unknown) => HttpResponse.json({ code: 0, data, msg: 'ok' });
const fail = (code: number, msg: string, status = 400) =>
  HttpResponse.json({ code, data: null, msg }, { status });

const TONES = ['primary', 'secondary', 'accent', 'info', 'success', 'warning'];

/**
 * 写请求体解析校验（镜像 Edge Fn parseSkillInput；违例返回中文 msg，与
 * Edge Fn 1014 语义一致——mock 里 msg 直接可读，无需 key 间接层）。
 * 返回 null = 通过；否则 = 错误 msg。
 */
function validateBody(
  body: Record<string, unknown>,
  partial: boolean,
): string | null {
  const title =
    body.title !== undefined ? String(body.title).trim() : undefined;
  if (!partial && !title) return '技能名称不能为空';
  if (partial && title === '') return '技能名称不能为空';
  if (
    body.rating !== undefined &&
    (!Number.isInteger(Number(body.rating)) ||
      Number(body.rating) < 1 ||
      Number(body.rating) > 5)
  ) {
    return '评分必须是 1–5 的整数';
  }
  if (body.tone !== undefined && !TONES.includes(String(body.tone))) {
    return '请求格式错误';
  }
  for (const key of ['outputTypes', 'roles', 'scenes', 'agents'] as const) {
    if (body[key] !== undefined && !Array.isArray(body[key])) {
      return '请求格式错误';
    }
  }
  return null;
}

/** 从 body 提取可写字段（camelCase 契约，镜像 parseSkillInput 的字段映射）。 */
function pickInput(body: Record<string, unknown>): Partial<RawSkillRow> {
  const out: Record<string, unknown> = {};
  if (body.title !== undefined) out.title = String(body.title).trim();
  if (body.free !== undefined) out.free = !!body.free;
  if (body.featured !== undefined) out.featured = !!body.featured;
  for (const key of ['outputTypes', 'roles', 'scenes', 'agents'] as const) {
    if (body[key] !== undefined) {
      // 入参 camel 契约 → 存储行 snake（镜像 parseSkillInput → DB 列映射）
      out[key === 'outputTypes' ? 'output_types' : key] = (
        body[key] as unknown[]
      ).map((v) => String(v));
    }
  }
  if (body.downloads !== undefined) out.downloads = Number(body.downloads) || 0;
  if (body.bookmarks !== undefined) out.bookmarks = Number(body.bookmarks) || 0;
  if (body.rating !== undefined) out.rating = Number(body.rating);
  if (body.tone !== undefined) out.tone = String(body.tone);
  return out as Partial<RawSkillRow>;
}

export const skillHandlers = [
  // GET 列表（匿名可调）
  ...pagePaths(SKILLS_COLLECTION_PATH).map((path) =>
    http.get(path, async () => {
      await delay(200);
      return ok(skills);
    }),
  ),

  // POST 新建（require skills:skill:create）
  ...pagePaths(SKILLS_COLLECTION_PATH).map((path) =>
    http.post(path, async ({ request }) => {
      await delay(200);
      if (!can(resolvePermissions(request), 'skills:skill:create')) {
        const auth = request.headers.get('authorization');
        return auth
          ? fail(1011, '没有执行此操作的权限', 403)
          : fail(1010, '请先登录', 401);
      }
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      if (!body) return fail(1001, '请求格式错误');
      const err = validateBody(body, false);
      if (err) return fail(1014, err);
      const node: RawSkillRow = {
        id: ++nextId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(pickInput(body) as Omit<
          RawSkillRow,
          'id' | 'created_at' | 'updated_at'
        >),
      };
      skills = [node, ...skills];
      return ok(node);
    }),
  ),

  // GET 详情（匿名可调）
  ...pagePaths(SKILLS_ITEM_PATH(':id')).map((path) =>
    http.get(path, async ({ params }) => {
      await delay(200);
      const row = skills.find((n) => n.id === Number(params['id']));
      if (!row) return fail(1013, '技能不存在', 404);
      return ok(row);
    }),
  ),

  // PUT 更新（require skills:skill:update；部分更新——body 缺省沿用行值）
  ...pagePaths(SKILLS_ITEM_PATH(':id')).map((path) =>
    http.put(path, async ({ request, params }) => {
      await delay(200);
      if (!can(resolvePermissions(request), 'skills:skill:update')) {
        const auth = request.headers.get('authorization');
        return auth
          ? fail(1011, '没有执行此操作的权限', 403)
          : fail(1010, '请先登录', 401);
      }
      const id = Number(params['id']);
      const row = skills.find((n) => n.id === id);
      if (!row) return fail(1013, '技能不存在', 404);
      const body = (await request.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      const err = validateBody(body, true);
      if (err) return fail(1014, err);
      Object.assign(row, pickInput(body), {
        updated_at: new Date().toISOString(),
      });
      return ok(row);
    }),
  ),

  // DELETE 删除（require skills:skill:delete）
  ...pagePaths(SKILLS_ITEM_PATH(':id')).map((path) =>
    http.delete(path, async ({ request, params }) => {
      await delay(200);
      if (!can(resolvePermissions(request), 'skills:skill:delete')) {
        const auth = request.headers.get('authorization');
        return auth
          ? fail(1011, '没有执行此操作的权限', 403)
          : fail(1010, '请先登录', 401);
      }
      const id = Number(params['id']);
      const row = skills.find((n) => n.id === id);
      if (!row) return fail(1013, '技能不存在', 404);
      skills = skills.filter((n) => n.id !== id);
      return ok({ id });
    }),
  ),
];

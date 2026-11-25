import { delay, http, HttpResponse } from 'msw';
import { INTEGRATION_PREFIX } from '../api/endpoints';
import { SKILLS_UPLOAD_PATH } from '../api/upload';
import { can, resolvePermissions } from './auth';

/*
 * skills-web 上传 mock handler（任务 11-25-skills-form-upload）。
 *
 * 契约 = skills-upload Edge Fn（apps/skills-web/supabase/functions/
 * skills-upload/index.ts）：
 * - POST multipart（字段 file）→ envelope { code, data: { url, name, size } }
 * - 无 JWT → 1010/401；无 create/update 码 → 1011/403
 * - 缺 file 字段 / 类型不符 / 超限 → 1014（msg 与 fn 文案对齐）
 * - mock 不做真实类型/大小校验的数据面检查（文件对象在 MSW 里是占位）——
 *   行为覆盖：成功返回假 URL、权限门控两条主路径
 */

const pagePaths = (p: string) => [p, `${INTEGRATION_PREFIX}${p}`];

const ok = (data: unknown) => HttpResponse.json({ code: 0, data, msg: 'ok' });
const fail = (code: number, msg: string, status = 400) =>
  HttpResponse.json({ code, data: null, msg }, { status });

export const uploadHandlers = pagePaths(SKILLS_UPLOAD_PATH).map((path) =>
  http.post(path, async ({ request }) => {
    await delay(300);
    // 权限：create 或 update 任一（与 fn requireUploadPermission 同语义）
    const perms = resolvePermissions(request);
    if (
      !can(perms, 'skills:skill:create') &&
      !can(perms, 'skills:skill:update')
    ) {
      const auth = request.headers.get('authorization');
      return auth
        ? fail(1011, '没有执行此操作的权限', 403)
        : fail(1010, '请先登录', 401);
    }
    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File))
      return fail(1014, '缺少上传文件（字段名 file）');
    // 假 URL（mock 无 Storage）；保留扩展名便于前端按 kind 推断
    const name = file.name || 'upload.bin';
    return ok({
      url: `https://mock.storage/skill-assets/mock/${encodeURIComponent(name)}`,
      name,
      size: file.size,
    });
  }),
);

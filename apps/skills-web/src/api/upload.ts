/*
 * skills-web 上传域 api —— `/functions/v1/skills-upload` 调用（任务
 * 11-25-skills-form-upload）。
 *
 * 契约：POST multipart/form-data（字段名 file）→ envelope { code, data, msg }
 * → data: { url, name, size }。鉴权头由传输层注入（与 skills 域一致）；
 * 失败统一上抛 Error(msg)（toError 语义同 skills.ts）。
 *
 * **不用 RequestClient 传 multipart**：FileUploader/FormData 走裸 fetch——
 * axios 层的 envelope 解包拦截器对 FormData 上传同样可用，但此处响应处理
 * 简单（单字段），直接 fetch + 手动解包更直观；鉴权头从与 skills 域相同的
 * 通道取（props.http 消费收敛在 utils/http.ts——本模块经它导出的底层实例）。
 */
import { apiPrefix } from './prefix';
import { toError } from './skills';

/** 上传响应 data。 */
export interface UploadResult {
  url: string;
  name: string;
  size: number;
}

export const SKILLS_UPLOAD_PATH = '/functions/v1/skills-upload';

/** 上传单文件 → { url, name, size }。 */
export async function uploadFile(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  let res: unknown;
  try {
    const resp = await fetch(`${apiPrefix()}${SKILLS_UPLOAD_PATH}`, {
      method: 'POST',
      body: form,
    });
    res = await resp.json();
  } catch (e) {
    throw toError(e);
  }
  const envelope = res as { code?: number; data?: UploadResult; msg?: string };
  if (envelope?.code === 0 && envelope.data?.url) return envelope.data;
  throw new Error(envelope?.msg || undefined);
}

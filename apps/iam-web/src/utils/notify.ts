import { notify } from '@zanelab/utils';
import { getProps } from '../props';

/*
 * 子应用通知出口（任务：菜单页错误 toast 化）：
 * - 集成态：props.onNotify 上抛宿主 → 宿主 ToastRegion 渲染（qiankun 沙箱下
 *   直接调 notify 会进子应用 bundle 的独立实例，宿主收不到——必须走 props）
 * - 独立态：props.onNotify 缺省 → 本地 notify（main.tsx 需挂本地 ToastRegion）
 *
 * **防双弹**：集成态走宿主 props.http 时，宿主拦截器链已对 403/5xx/网络错/
 * envelope 业务失败统一 notify（spec「错误处理走拦截器」契约）——调用方再弹
 * 就是两份。故本助手在集成态**默认吞掉**（doNotify=false 的调用不转发），
 * 只有拦截器不覆盖的场景（如 404）由调用方显式传 doNotify=true。
 * 独立态无拦截器通知，调用方的 showToast 即唯一一次。
 */
export function showToast(
  message: string,
  level: 'error' | 'warning' | 'success' | 'info' = 'error',
  doNotify = false,
): void {
  const onNotify = getProps().onNotify;
  if (typeof onNotify === 'function') {
    if (doNotify) onNotify(message, level);
    return;
  }
  if (level === 'warning') notify.warning(message);
  else if (level === 'success') notify.success(message);
  else if (level === 'info') notify.info(message);
  else notify.error(message);
}

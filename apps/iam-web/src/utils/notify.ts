import { notify } from '@zanelab/utils';
import { getProps } from '../props';

/*
 * 子应用通知出口（任务：菜单页错误 toast 化）：
 * - 集成态：props.onNotify 上抛宿主 → 宿主 ToastRegion 渲染（qiankun 沙箱下
 *   直接调 notify 会进子应用 bundle 的独立实例，宿主收不到——必须走 props）
 * - 独立态：props.onNotify 缺省 → 本地 notify（main.tsx 需挂本地 ToastRegion）
 */
export function showToast(
  message: string,
  level: 'error' | 'warning' | 'success' | 'info' = 'error',
): void {
  const onNotify = getProps().onNotify;
  if (typeof onNotify === 'function') {
    onNotify(message, level);
    return;
  }
  if (level === 'warning') notify.warning(message);
  else if (level === 'success') notify.success(message);
  else if (level === 'info') notify.info(message);
  else notify.error(message);
}

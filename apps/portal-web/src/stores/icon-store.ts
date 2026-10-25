import { create } from 'zustand';
import { appConfig } from '../config';
import { IconDataSchema } from '@zanelab/types';
import type { IconData } from '@zanelab/types';

/**
 * 运行时图标注册表（09-08-icon-registry）：后端菜单 icon 字段只是标识符，
 * 标识符 → path-data 图标的映射在运行时注入（部署期改配置即可，免重编译）。
 *
 * 注入通道（三条汇入本 store，见 initIcons / window.__registerIcons）：
 * 1. config.js 顶层 icons（内联包）
 * 2. config.js 顶层 iconPackUrl（远端 JSON，fetch 注册；失败静默降级）
 * 3. window.__registerIcons(pack)（qiankun 子应用/第三方脚本）
 *
 * 解析顺序见 components/icons/app-icon.tsx：本 store → 内置表 → svg: 直通 → null。
 * 异步时序：iconPackUrl 晚于菜单渲染不阻塞——store 更新驱动订阅组件补画。
 */
interface IconState {
  /** 标识符 → path-data 图标（运行时注册，浅合并覆盖同键） */
  icons: Record<string, IconData>;
  registerIcons: (pack: Record<string, IconData>) => void;
}

/**
 * 逐条 zod 校验后合并（安全边界：只收 path-data 形态，IconDataSchema 拒绝其余）。
 * 非法条目 console.warn 跳过、不阻塞其余注册——否则畸形数据会在渲染期
 * `data.paths.map` 抛错并炸掉整棵菜单树。
 */
function sanitizePack(
  pack: Record<string, IconData>,
): Record<string, IconData> {
  const valid: Record<string, IconData> = {};
  for (const [key, value] of Object.entries(pack)) {
    const parsed = IconDataSchema.safeParse(value);
    if (parsed.success) {
      valid[key] = parsed.data;
    } else {
      console.warn(
        `[icon-registry] 图标条目 "${key}" 校验失败已跳过（须为 { viewBox?, paths: string[] }）：`,
        value,
      );
    }
  }
  return valid;
}

export const useIconStore = create<IconState>((set) => ({
  icons: {},
  registerIcons: (pack) => {
    const next = sanitizePack(pack);
    if (!Object.keys(next).length) return;
    set((state) => ({ icons: { ...state.icons, ...next } }));
  },
}));

declare global {
  interface Window {
    __registerIcons?: (pack: Record<string, IconData>) => void;
  }
}

// 全局注册入口：子应用 mount 时可经 props/sandbox 之外的最简通道注册图标
// （部署侧可信内容，与 config.js 同信任级别）
window.__registerIcons = (pack) => useIconStore.getState().registerIcons(pack);

/**
 * 启动时初始化（main.tsx 在 appConfig 就绪后调用一次）：
 * 内联包立即注册；远端包异步注册（失败 console.warn，不阻塞页面）。
 */
export async function initIcons(): Promise<void> {
  const inline = appConfig.icons;
  if (inline && Object.keys(inline).length) {
    useIconStore.getState().registerIcons(inline);
  }
  if (appConfig.iconPackUrl) {
    try {
      const res = await fetch(appConfig.iconPackUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: unknown = await res.json();
      if (!json || typeof json !== 'object' || Array.isArray(json)) {
        throw new Error('包格式非法（须为 { icons: { ... } } 或扁平 record）');
      }

      // 包格式：{ icons: { 标识符: IconData } }（允许附带说明字段）；也兼容扁平 record
      const record = json as Record<string, unknown>;
      const nested = record.icons;
      const pack =
        nested && typeof nested === 'object' && !Array.isArray(nested)
          ? (nested as Record<string, IconData>)
          : (record as Record<string, IconData>);
      useIconStore.getState().registerIcons(pack);
    } catch (err) {
      console.warn('[icon-registry] iconPackUrl 加载失败，已跳过：', err);
    }
  }
}

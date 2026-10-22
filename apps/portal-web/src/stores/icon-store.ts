import { create } from 'zustand';
import { appConfig } from '../config';
import { IconDataSchema } from '@zanelab/types';
import type { IconData } from '@zanelab/types';

interface IconState {
  icons: Record<string, IconData>;
  registerIcons: (pack: Record<string, IconData>) => void;
}

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

window.__registerIcons = (pack) => useIconStore.getState().registerIcons(pack);

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

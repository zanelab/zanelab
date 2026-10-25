import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { loadConfig } from '../config';
import type { AppConfig } from '@zanelab/types';

const ConfigContext = createContext<AppConfig | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  // 挂载期读取一次 window.__APP_CONFIG__（含合并与 zod 校验，见 spec/config）。
  const config = useMemo(() => loadConfig(), []);
  return (
    <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
  );
}

export function useConfig(): AppConfig {
  const config = useContext(ConfigContext);
  // 无 Provider（如单测/深层组件）时回退模块级实例，避免渲染报错。
  return config ?? loadConfig();
}

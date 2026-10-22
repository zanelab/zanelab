import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { loadConfig } from '../config';
import type { AppConfig } from '@zanelab/types';

const ConfigContext = createContext<AppConfig | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const config = useMemo(() => loadConfig(), []);
  return (
    <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
  );
}

export function useConfig(): AppConfig {
  const config = useContext(ConfigContext);

  return config ?? loadConfig();
}

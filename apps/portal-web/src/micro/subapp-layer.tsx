import { useLocation } from 'react-router-dom';
import { appConfig } from '../config';
import type { MicroAppConfig } from '@zanelab/types';

export type SubAppEntry = [appName: string, cfg: MicroAppConfig];

function containerId(appName: string, container?: string): string {
  return container?.replace(/^#/, '') || `subapp-${appName}`;
}

export function SubAppLayer({ apps }: { apps?: SubAppEntry[] }) {
  const { pathname } = useLocation();
  const entries = apps ?? Object.entries(appConfig.microApps);
  return (
    <>
      {entries.map(([appName, cfg]) => (
        <div
          key={appName}
          id={containerId(appName, cfg.container)}
          data-subapp={appName}
          className="absolute inset-0"
          hidden={!pathname.startsWith(cfg.activeRule)}
        />
      ))}
    </>
  );
}

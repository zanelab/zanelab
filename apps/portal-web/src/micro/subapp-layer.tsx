import { useLocation } from 'react-router-dom';
import { appConfig } from '../config';
import type { MicroAppConfig } from '@zanelab/types';

// 子应用常驻容器层（09-08-persistent-subapp-container）：
// qiankun 重挂载（走缓存、近乎同步）会抢在 React 渲染出路由级容器 div 之前执行
// → "Target container ... not existed"。容器不随路由条件渲染，改为布局内
// 常驻（App.tsx 经 BasicLayout contentLayer 注入，与内容区同级），hidden 仅做
// 视觉切换——mount 任何时刻都能找到容器。
// 路由侧只渲染占位（见 generateRoutes），activeRule 内外切换可见性。
// 边界：本层随 BasicLayout 存在，而登录/锁屏页在 layout 之外——
// auth→layout 的穿越导航必须走 flushSync 类同步提交，否则整树切换的
// transition 提交仍会输给 remount。
export type SubAppEntry = [appName: string, cfg: MicroAppConfig];

/** 容器 id：config container（去 #）或缺省 subapp-<appName>。 */
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

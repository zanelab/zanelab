import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';

/**
 * 子应用静态资源路径解析（任务 11-26-skills-agent-page-visual）。
 *
 * **为什么需要**：集成态（qiankun）下页面 origin 是宿主（portal :5173），
 * 但静态资源在子应用自己的服务器（:8084）。写死 `/images/agents/x.svg`
 * 会命中宿主的 public 目录 → 404。
 *
 * **解析规则**：
 * - 独立态（无宿主）：`/images/agents/x.svg`（子应用自身 origin 相对路径）；
 * - 集成态：`__INJECTED_PUBLIC_PATH_BY_QIANKUN__` + 相对路径（qiankun 注入的
 *   子应用 base，如 `//localhost:8084/`）——dev 模式下 vite-plugin-qiankun
 *   用同一前缀把模块请求转回子应用服务器，静态资源同理。
 *
 * 宿主未注入该字段时（如旧版 qiankun 或构建产物差异）退回独立态路径，
 * 保证不崩（图标 404 → 回退首字母方块，AgentIcon 组件兜底）。
 */
export function agentAssetUrl(fileName: string): string {
  const proxy = qiankunWindow.proxy as
    { __INJECTED_PUBLIC_PATH_BY_QIANKUN__?: string } | undefined;
  const injected = proxy?.__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
  const relative = `images/agents/${fileName}`;
  if (typeof injected === 'string' && injected.length > 0) {
    // injected 形如 '//localhost:8084/'（带尾斜杠）
    return `${injected.replace(/\/$/, '')}/${relative}`;
  }
  return `/${relative}`;
}

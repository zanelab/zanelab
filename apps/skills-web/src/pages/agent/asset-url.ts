/**
 * 子应用静态资源路径解析（qiankun 集成态）。
 *
 * **为什么需要**：集成态下页面 origin 是宿主（portal :5173），但子应用的
 * 资源在自己的服务器（:8084）。Vite dev 态对 `?url` 导入返回**根相对路径**
 * （`/src/assets/agents/x.svg`），生产态配合 `base: './'` 返回相对路径或
 * `new URL(x, import.meta.url)` 形式——都可能被浏览器解析到宿主 origin →
 * 宿主 SPA 回落返回 text/html → 浏览器按图片解析失败 → **裂图**。
 *
 * **为什么不用 qiankunWindow 常量**：它是模块加载时求值的
 * `window.proxy || window` **快照**——dev 态模块图执行时宿主尚未注入 proxy，
 * 快照恒为 window 本尊，之后再读它的 `.proxy` 恒为 undefined。改为**每次
 * 调用动态读 window.proxy**，与 qiankun 注入时机无关。
 *
 * **解析规则**：
 * - 独立态（无宿主）：原样返回（子应用自身 origin 相对路径）；
 * - 集成态：`__INJECTED_PUBLIC_PATH_BY_QIANKUN__`（qiankun 注入的子应用
 *   base，如 `//localhost:8084/`）+ 去掉前导斜杠的相对路径。
 *
 * 宿主未注入该字段时（如旧版 qiankun 或构建产物差异）退回独立态路径，
 * 保证不崩（图标 404 → 回退字母圆块，AgentIcon 组件兜底）。
 */
export function subAppAssetUrl(url: string): string {
  // 动态读 window.proxy（不缓存）——见上方「为什么不用 qiankunWindow 常量」
  const proxy = (window as unknown as { proxy?: Record<string, unknown> })
    .proxy as { __INJECTED_PUBLIC_PATH_BY_QIANKUN__?: string } | undefined;
  const injected = proxy?.__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
  if (typeof injected !== 'string' || injected.length === 0) {
    return url;
  }
  // 已是绝对 URL（data URI / http(s) / blob）→ 不处理
  if (/^(data:|https?:|blob:)/.test(url)) return url;
  // injected 形如 '//localhost:8084/'（带尾斜杠）
  const base = injected.replace(/\/$/, '');
  return `${base}/${url.replace(/^\//, '')}`;
}

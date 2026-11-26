import { describe, expect, it } from 'vitest';
import { subAppAssetUrl } from './asset-url';

/**
 * qiankun 集成态资源路径解析。
 *
 * **背景**：集成态下页面 origin 是宿主（portal :5173），子应用资源在自己的
 * 服务器（:8084）。Vite dev 态 `?url` 导入返回根相对路径
 * （`/src/assets/agents/x.svg`）——浏览器会拿宿主 origin 去请求 → 宿主 SPA
 * 回落返回 text/html → 浏览器按图片解析失败 → **裂图**。
 *
 * 漏这条契约的后果：图标在独立态（:8084 直开）正常，集成态下所有**外链
 * 形态**的图标（>=4KB，未被 Vite 内联成 data URI）集体裂图——而 <4KB 的
 * 内联图标因走 data URI 不受影响 → 表现为「一部分图标裂、一部分正常」。
 */
describe('subAppAssetUrl —— qiankun 集成态资源路径', () => {
  /**
   * 模拟 qiankun 注入的 publicPath（形如 '//localhost:8084/'）。
   *
   * qiankunWindow 在无 window.proxy 时回退为 window 本身（模块加载时求值），
   * 故注入必须走 window.proxy —— 这也是 qiankun 集成态的实际注入点。
   */
  function setInjectedPublicPath(value: string | undefined) {
    const w = window as unknown as { proxy?: Record<string, unknown> };
    if (value === undefined) {
      delete w.proxy;
    } else {
      w.proxy = { __INJECTED_PUBLIC_PATH_BY_QIANKUN__: value };
    }
  }

  it('独立态（未注入 publicPath）：原样返回', () => {
    setInjectedPublicPath(undefined);
    expect(subAppAssetUrl('/src/assets/agents/antigravity.svg')).toBe(
      '/src/assets/agents/antigravity.svg',
    );
  });

  it('集成态：改写到子应用自己的 origin', () => {
    setInjectedPublicPath('//localhost:8084/');
    expect(subAppAssetUrl('/src/assets/agents/antigravity.svg')).toBe(
      '//localhost:8084/src/assets/agents/antigravity.svg',
    );
    setInjectedPublicPath(undefined);
  });

  it('集成态：publicPath 无尾斜杠也能正确拼接', () => {
    setInjectedPublicPath('//localhost:8084');
    expect(subAppAssetUrl('/src/assets/agents/x.svg')).toBe(
      '//localhost:8084/src/assets/agents/x.svg',
    );
    setInjectedPublicPath(undefined);
  });

  it('绝对 URL（data URI / http）不处理', () => {
    setInjectedPublicPath('//localhost:8084/');
    const dataUri = 'data:image/svg+xml,%3csvg%3e';
    expect(subAppAssetUrl(dataUri)).toBe(dataUri);
    expect(subAppAssetUrl('https://cdn.example.com/x.svg')).toBe(
      'https://cdn.example.com/x.svg',
    );
    setInjectedPublicPath(undefined);
  });
});

describe('agentIconUrl —— 出口统一走集成态改写', () => {
  it('集成态下外链图标 URL 改写到子应用 origin', async () => {
    const w = window as unknown as { proxy?: Record<string, unknown> };
    w.proxy = { __INJECTED_PUBLIC_PATH_BY_QIANKUN__: '//localhost:8084/' };
    const { agentIconUrl } = await import('./agent-icons');
    const url = agentIconUrl('antigravity.svg') as string;
    // antigravity.svg >4KB 不被内联 → dev 态为 /src/assets/... 根相对路径
    expect(url.startsWith('//localhost:8084/')).toBe(true);
    delete w.proxy;
  });

  it('独立态下返回原路径', async () => {
    const { agentIconUrl } = await import('./agent-icons');
    const url = agentIconUrl('antigravity.svg') as string;
    expect(url).toMatch(/^\/(src\/)?assets\//);
  });
});

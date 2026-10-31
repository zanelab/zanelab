import { createRoot, type Root } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import {
  renderWithQiankun,
  qiankunWindow,
} from 'vite-plugin-qiankun/dist/helper';
import { App } from './App';
// 独立运行态唯一样式来源（集成态样式由宿主注入，见 index.css 头注释）
import './index.css';
import { setupI18n, setLocale } from './locales/i18n';

let root: Root | null = null;

/** 语言订阅取消函数（mount 接线，unmount 清理——避免重复订阅累积）。 */
let unsubscribeLocale: (() => void) | null = null;

/**
 * 接线基座语言：初始语言取 props.preferences.locale，运行期经
 * onHostStateChange 订阅快照增量（宿主 register.ts 的推送快照含 preferences
 * 外观子集，locale 变更会进来）。基座是语言的唯一真相源，子应用不持本地偏好。
 */
function setupLocale(props: PltProps) {
  setupI18n(props.preferences?.locale);
  unsubscribeLocale?.();
  unsubscribeLocale = null;
  if (typeof props.onHostStateChange !== 'function') return;
  unsubscribeLocale = props.onHostStateChange((state) => {
    const prefs = state.preferences as { locale?: string } | undefined;
    setLocale(prefs?.locale);
  });
}

/** 宿主下发的偏好外观子集（getter，每次 mount 取最新值）。
 * 跨应用契约按形状对齐宿主 SubAppPreferences（apps/portal-web/src/micro/register.ts），不 import。 */
export interface SubAppPreferences {
  mode: 'light' | 'dark' | 'auto';
  colorPrimary: string;
  colorDestructive: string;
  colorSuccess: string;
  colorWarning: string;
  radius: string; // rem 数值字符串，如 '0.5'
  fontSize: number;
  colorGrayMode: boolean;
  colorWeakMode: boolean;
  locale: string;
}

/**
 * 宿主共享 http 通道的结构化子集（D2：window.__http = RequestClient 只读代理）。
 *
 * 宿主类型是 packages/utils 的 RequestClient（@zanelab/utils）；iam 不引其全量
 * （跨包类型依赖收敛），按消费面在此声明同形子集——方法签名与 RequestClient
 * 公开方法对齐（get/post/put/delete/upload/download/postSSE/requestSSE），
 * index signature 保留宿主后续扩展字段透传。
 */
export interface HostHttpClient {
  get: <T = unknown>(url: string, config?: unknown) => Promise<T>;
  post: <T = unknown>(
    url: string,
    data?: unknown,
    config?: unknown,
  ) => Promise<T>;
  put: <T = unknown>(
    url: string,
    data?: unknown,
    config?: unknown,
  ) => Promise<T>;
  delete: <T = unknown>(url: string, config?: unknown) => Promise<T>;
  upload: <T = unknown>(
    url: string,
    data: Record<string, unknown> & { file: Blob | File },
    config?: unknown,
  ) => Promise<T>;
  download: <T = unknown>(url: string, config?: unknown) => Promise<T>;
  [key: string]: unknown;
}

export interface PltProps {
  container?: HTMLElement;
  setHasRender?: (v: boolean) => void;

  getHostState?: () => Record<string, unknown>;

  /** 宿主下发的偏好外观子集（getter，每次 mount 取最新值） */
  preferences?: SubAppPreferences;

  onHostStateChange?: (
    cb: (state: Record<string, unknown>, prev: Record<string, unknown>) => void,
    fireImmediately?: boolean,
  ) => () => void;
  onLoginSuccess?: (params: {
    token: string;
    refreshToken?: string;
    user?: {
      id?: number | string;
      username?: string;
      nickname?: string;
      [key: string]: unknown;
    };
  }) => Promise<void>;
  /** 宿主共享 http 通道（RequestClient 只读代理，见 HostHttpClient） */
  http?: HostHttpClient;
  [key: string]: unknown;
}

let savedProps: PltProps = {};

export function getProps(): PltProps {
  return savedProps;
}

function render(props: PltProps) {
  const container = props.container ?? document.getElementById('root')!;
  const basename = (props.basename as string | undefined) ?? '/system';
  root = createRoot(container);
  root.render(
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>,
  );
  props.setHasRender?.(true);
}

/** mock worker 启动（幂等）：独立 dev 态与集成态都要拦——
 * MSW 的 Service Worker 注册在**页面 origin** 上，只拦页面自身 fetch。
 * 集成态（qiankun）请求发自 portal 页面（:5173）经宿主 vite proxy 转发，
 * 转发请求是 **vite server 层**的 HTTP——vite dev server 没有中间件，唯一
 * 拦截点是 5173 origin 上的 SW。worker 只在独立分支启动的话，集成态没有任何
 * 拦截者 → 转发落到 8081 vite server（无路由）→ 404（2026-10-26 实测踩坑）。
 * 同一进程只 start 一次（MSW 重复 start 幂等，这里显式守卫防竞态）。 */
let workerStarted = false;
async function startMockWorker() {
  if (workerStarted) return;
  workerStarted = true;
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}

renderWithQiankun({
  bootstrap() {
    console.log('[iam] bootstrap');
  },
  mount(props) {
    savedProps = props as PltProps;
    console.log('[iam] mount', props.basename);
    setupLocale(savedProps); // i18n 初始化/复挂载对齐 + 语言订阅（React 渲染前）
    // 集成态也要启动 worker：mock 拦截点在页面 origin 的 SW（见函数注释）
    if (import.meta.env.DEV && import.meta.env.VITE_IAM_USE_MOCK === 'true') {
      void startMockWorker();
    }
    render(savedProps);
  },
  update() {},
  unmount() {
    console.log('[iam] unmount');
    unsubscribeLocale?.();
    unsubscribeLocale = null;
    root?.unmount();
    root = null;
    savedProps = {};
  },
});

if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  // 独立运行（不经基座）：无 props，i18n 以缺省 zh-CN 初始化。
  // html 缺省 data-theme="light"——daisyUI 5 的 base-* token（.modal-box
  // background: var(--color-base-100) 等）只在 [data-theme=light|dark] 命中时
  // 声明；集成态由宿主 main.tsx 无条件设 html 属性，独立态无人设 → token 未
  // 定义 → modal-box/组件背景全透明。宿主偏好运行期仍经 LoginPage 根 div
  // data-theme 派生（dark 覆盖 page 局部，不回写 html）。
  document.documentElement.dataset.theme ||= 'light';
  // mock 启动独立分支同样调用（幂等，见 startMockWorker 注释）。
  void (async () => {
    setupI18n();
    if (import.meta.env.DEV && import.meta.env.VITE_IAM_USE_MOCK === 'true') {
      await startMockWorker();
    }
    render({ basename: '/' });
  })();
}

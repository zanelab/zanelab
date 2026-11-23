import { createRoot, type Root } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import {
  renderWithQiankun,
  qiankunWindow,
} from 'vite-plugin-qiankun/dist/helper';
import { App } from './App';
// 独立运行态唯一样式来源（集成态样式由宿主注入，见 index.css 头注释）
import './index.css';
import { setupI18n, setLocale, injectMessagePacks } from './locales/i18n';
import { getProps, setProps, type SkillsProps } from './props';

// 对齐 iam-web 的轻量 props 契约：集成态消费 container/basename + 权限
// （permissions 是 getter 语义，每次 render 经 getProps() 读最新值，见 props.ts）；
// 本应用不消费 token/user/http，也不订阅宿主状态。
// 注意：SkillsProps 声明在 props.ts（非本文件）——Permission 组件经 props.ts 的
// getProps() 读权限，测试 import 组件时不得连带执行本入口的顶层 render 副作用。

let root: Root | null = null;

/** 语言订阅取消函数（mount 接线，unmount 清理——避免重复订阅累积）。 */
let unsubscribeLocale: (() => void) | null = null;

/**
 * mock worker 启动（幂等；iam main.tsx startMockWorker 同款）：独立 dev 态与
 * 集成态都要拦——MSW 的 Service Worker 注册在**页面 origin** 上，只拦页面自身
 * fetch。集成态（qiankun）请求发自 portal 页面（:5173）经宿主 vite proxy 转发，
 * 转发请求是 **vite server 层**的 HTTP——唯一拦截点是 5173 origin 上的 SW。
 * worker 只在独立分支启动的话，集成态没有任何拦截者 → 转发落到 8084 vite
 * server（无路由）→ 404（iam 2026-10-26 实测踩坑）。
 * 同一进程只 start 一次（MSW 重复 start 幂等，这里显式守卫防竞态）。
 */
let workerStarted = false;
async function startMockWorker() {
  if (workerStarted) return;
  workerStarted = true;
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}

/**
 * 接线基座语言（iam main.tsx setupLocale 同款）：初始语言取
 * props.preferences.locale，运行期经 onHostStateChange 订阅快照增量（宿主
 * register.ts 的推送快照含 preferences 外观子集，locale 变更会进来）。
 * 基座是语言的唯一真相源，子应用不持本地偏好。setLocale 自带同值 no-op——
 * 宿主快照是全量推送，locale 未变时不触发 changeLanguage。
 */
function setupLocale(props: SkillsProps) {
  setupI18n(props.preferences?.locale);
  unsubscribeLocale?.();
  unsubscribeLocale = null;
  if (typeof props.onHostStateChange !== 'function') return;
  unsubscribeLocale = props.onHostStateChange((state) => {
    const prefs = state.preferences as { locale?: string } | undefined;
    setLocale(prefs?.locale);
  });
}

/**
 * 接线基座下发的运行时语言包（props.i18n.packUrls 注入 locales/i18n 的
 * 懒加载表；初始语言的包由 setupI18n 内部触发，运行期切语言由 setLocale 触发）。
 * 独立态（无宿主）：不调用——packUrls 空 → 懒加载 no-op，用内置语言包。
 */
function setupHostMessagePacks(props: SkillsProps) {
  const packUrls = props.i18n?.packUrls;
  if (packUrls && typeof packUrls === 'object') {
    injectMessagePacks(packUrls);
  }
}

function render(props: SkillsProps) {
  const container = props.container ?? document.getElementById('root')!;
  const basename = (props.basename as string | undefined) ?? '/skills';
  root = createRoot(container);
  root.render(
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>,
  );
  props.setHasRender?.(true);
}

renderWithQiankun({
  bootstrap() {
    console.log('[skills] bootstrap');
  },
  mount(props) {
    setProps(props as SkillsProps);
    console.log('[skills] mount', props.basename);
    // i18n 初始化/复挂载对齐 + 语言订阅（React 渲染前，iam main.tsx 同款顺序）
    setupLocale(getProps());
    setupHostMessagePacks(getProps());
    // 集成态也要启动 worker：mock 拦截点在页面 origin 的 SW（见函数注释）
    if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
      void startMockWorker();
    }
    render(props as SkillsProps);
  },
  update() {},
  unmount() {
    console.log('[skills] unmount');
    unsubscribeLocale?.();
    unsubscribeLocale = null;
    root?.unmount();
    root = null;
    setProps({});
  },
});

if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  // 独立运行（不经基座）：无 props，i18n 以缺省 zh-CN 初始化。
  // html 缺省 data-theme="light"——daisyUI 5 的 base-* token 只在
  // [data-theme=light|dark] 命中时声明，无人设 → 组件背景全透明
  // （与 iam-web 同款修复，见其 main.tsx 注释）。集成态由宿主 main.tsx 设置。
  document.documentElement.dataset.theme ||= 'light';
  // 独立态无宿主 props：setProps({}) 后 getProps().permissions 为 undefined
  // → Permission 视作独立态，一律放行（后端 403 兜底）
  void (async () => {
    setupI18n(); // undefined → 缺省 zh-CN（packUrls 空 → 懒加载 no-op）
    // mock 启动独立分支同样调用（幂等，见 startMockWorker 注释）
    if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
      await startMockWorker();
    }
    render({ basename: '/' });
  })();
}

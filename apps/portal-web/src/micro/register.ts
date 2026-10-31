import { registerMicroApps, start, type RegistrableApp } from 'qiankun';
import { appConfig } from '../config';
import { useAuthStore } from '../stores/auth-store';
import { useMenuStore } from '../stores/menu-store';
import { usePreferencesStore } from '../stores/preferences-store';
import { clearStoredTokens, handleLogout } from '../utils/auth';
import { isSessionExpiredError } from '../utils/http';
import { cache } from '@zanelab/utils';
import { LEGACY_TOKEN_KEY } from '../constants/auth';
import { fetchMenus } from '../api/menu';
import { isAuthPath } from '../router/auth-path';
import type { UserInfo } from '../types';

// qiankun 接线（父 design §6、§9.4）：注册读 appConfig.microApps；
// 全局状态 token/user/permissions/locale/preferences(外观子集) 由 auth/menu/
// preferences 三个 store 的 subscribe 单向同步（只在 main.tsx 一处 init）。

/** 容器 id：config container（去 #）或缺省 subapp-<appName>。 */
function containerId(appName: string, container?: string): string {
  return container?.replace(/^#/, '') || `subapp-${appName}`;
}

/**
 * 登录成功后的编排（§5.1）：存 token → 拉菜单 → menuStore.setMenus →
 * 注册子应用（props 带最新 token/permissions；此前登录路径不注册，
 * 首次登录进去子应用拿不到注入值）。路由由 App 层从 menuStore 生成
 * （generateRoutes），qiankun 注册在菜单就绪后执行（activeRule 与菜单
 * appName 对齐）。
 *
 * 旧项目兼容存储（迁移自 Micro-public Login/handleRedirect 链路）：
 * - cache_AILab-Token / cache_UserInfo：子应用共享 token 与用户信息
 */
export async function bootstrapSession(
  token: string,
  refreshToken?: string,
  user?: UserInfo,
) {
  // 新项目存储（http 拦截器读 token）
  localStorage.setItem(appConfig.auth.tokenKey, token);
  if (refreshToken)
    localStorage.setItem(appConfig.auth.refreshTokenKey, refreshToken);
  useAuthStore.getState().setAuth({ token, refreshToken, user });

  // 旧项目兼容存储（cache_ 前缀，子应用经 localStorage 共享）
  cache.set(LEGACY_TOKEN_KEY, token);
  if (user) cache.set('UserInfo', user);

  // 登录后拉取用户权限和菜单（旧项目 handleRedirect → getUserPer 链路）
  // 失败不阻塞主流程——子应用可自行重新拉取
  const menus = await fetchMenus();
  useMenuStore.getState().setMenus(menus);
  setupMicroApps();
}

/**
 * 会话恢复（刷新页面时由 main.tsx 调用）。
 *
 * 与 bootstrapSession 对齐：从 cache 恢复用户信息（刷新后 auth store 的
 * user 为 null），再拉菜单。登录态失效（业务码/401）→ 整页跳登录页。
 */
export async function restoreSession(token: string): Promise<void> {
  useAuthStore.getState().setToken(token);
  cache.set(LEGACY_TOKEN_KEY, token);
  // 从 cache 恢复用户信息（刷新后 auth store 的 user 为 null）
  const cachedUser = cache.get<UserInfo>('UserInfo');
  if (cachedUser) useAuthStore.getState().setUser(cachedUser);

  try {
    const menus = await fetchMenus();
    useMenuStore.getState().setMenus(menus);
  } catch (e) {
    // 菜单拉取失败（token 过期等）→ 401 链路 handleLogout 已处理
    console.warn('[restoreSession] fetchMenus failed:', e);
    if (isSessionExpiredError(e)) {
      redirectToLogin();
      return;
    }
  }
  setupMicroApps();
}

/**
 * 登录态失效的启动期兜底：清态 + 整页跳登录页。
 *
 * 为什么不用 App 内的 watchGlobalLogout：restoreSession 在 renderApp() 之前
 * 执行，global-logout 事件此时没有监听者。replace 不进历史记录，避免用户
 * 返回时又落回失效页面。
 */
function redirectToLogin(): void {
  handleLogout(); // 再清一次（幂等，事件此时无人接收也无害）
  window.location.replace(appConfig.auth.loginPath);
}

// 未登录时拉公开菜单子集（后端按请求无 token 返回，如 home）。
// 失败仅 warn——menus 为空时壳照常渲染，homePath 指向子应用则内容仍可见。
export async function loadPublicMenus(): Promise<void> {
  try {
    const menus = await fetchMenus();
    useMenuStore.getState().setMenus(menus);
  } catch (e) {
    console.warn('[loadPublicMenus] 公开菜单拉取失败：', e);
  }
}

let registered = false;
let started = false;
/** start 轮询代数：__resetMicroAppsForTest 递增，作废挂起的轮询（防跨用例污染） */
let startPollGeneration = 0;

/** 仅供测试：重置「已注册/已启动」标记 */
export function __resetMicroAppsForTest() {
  registered = false;
  started = false;
  startPollGeneration++;
}

/**
 * qiankun 全局 sandbox 配置：开启实验性样式隔离。
 *
 * 为什么需要：宿主（本应用，上游 token 体系）与子应用各自带一套全局设计
 * 系统，且可能都在 :root 声明同名变量（--primary / --background / --radius 等）。
 * qiankun 默认不做 CSS 隔离，子应用的 <style> / <link> 直接进入 document，
 * 后注入会覆盖宿主 :root 变量，使宿主 hsl(var(--x)) 等消费方失效；子应用的
 * 通配符与 html / body 选择器也会作用到宿主元素。experimentalStyleIsolation
 * 把子应用选择器重写为容器作用域，变量与全局规则收敛进子应用容器。
 */
const QIANKUN_STYLE_ISOLATION_SANDBOX = { experimentalStyleIsolation: true };

/**
 * 启动 qiankun：注册 config.microApps 中的全部子应用并 start。幂等（守卫）。
 *
 * token/permissions/locale/preferences 用 getter 而非值快照：single-spa 每次
 * mount 经 getProps 用 Object.assign 展开 customProps（会执行 getter），子应用
 * 每次挂载都读到 store 最新值——值快照会冻结在注册瞬间，首次访问（未登录先注册）
 * 时子应用拿到空 token/permissions。
 *
 * props 契约（子应用 mount(props) 可消费的全部字段）：
 * - http：共享 axios 实例（勿自建）
 * - token / permissions / locale / preferences(外观子集，SubAppPreferences)：getter，取 store 最新值
 * - getHostState / onHostStateChange：宿主全局状态读取/订阅（snapshot 同一契约）
 * - onLoginSuccess：子应用登录页回传会话（public 路由）
 * - base / basename：路由挂载前缀（= activeRule）
 * - ...cfg.props：config.js 的静态 props
 */
export function setupMicroApps() {
  if (registered) return;
  const apps: RegistrableApp<Record<string, unknown>>[] = Object.entries(
    appConfig.microApps,
  ).map(([appName, cfg]) => ({
    name: cfg.name || appName,
    entry: cfg.entry,
    container: `#${containerId(appName, cfg.container)}`,
    activeRule: cfg.activeRule,
    props: {
      ...cfg.props,

      // 共享 axios 实例（拦截器/token/错误处理一致，见 utils/http.ts）
      http: window.__http,

      // getter：每次 mount 取 store 最新值（见函数注释）
      get token() {
        return useAuthStore.getState().token;
      },
      get permissions() {
        return useMenuStore.getState().permissions;
      },
      // 当前语言（09-09-i18n R5）：子应用可选择性消费；后续变更经全局状态推送
      get locale() {
        return usePreferencesStore.getState().app.locale;
      },
      // 外观子集（契约见 SubAppPreferences，与 snapshot().preferences 同一结构）：
      // getter 语义与 token 一致——子应用每次 mount 读 store 最新值；运行期变更
      // （基座偏好面板修改）经 onHostStateChange 推送的新快照携带同一子集
      get preferences() {
        return subAppPreferences(usePreferencesStore.getState());
      },

      // 宿主状态读取 / 订阅 / 子应用登录回传（见下方 snapshot / onLoginSuccess）
      getHostState,
      onHostStateChange,
      onLoginSuccess,

      // 路由挂载前缀显式传递（与 activeRule 对齐）：
      // - Vite 子应用（vite-plugin-qiankun）读 props.basename
      basename: cfg.activeRule,
    },
  }));
  if (apps.length === 0) return;
  registered = true;
  registerMicroApps(apps);
  // 预取按各子应用配置的 prefetch 字段生效（原实现固定 true，配置里的 prefetch
  // 形同虚设）：只预取 prefetch:true 的应用，避免「已注册但没启动/没部署」的子应用
  // 在宿主启动时产生无谓请求与代理报错。qiankun 的 PrefetchStrategy 函数形态即按
  // 名单预取，这里把 prefetch:true 的应用作为 critical 名单返回。
  const prefetchNames = new Set(
    Object.entries(appConfig.microApps)
      .filter(([, cfg]) => cfg.prefetch)
      .map(([key, cfg]) => cfg.name || key),
  );

  // start() 延迟到全部注册容器进 DOM（SubAppLayer 常驻层随首帧 React 提交渲染，
  // 而本函数可能在 renderApp() 之前被调——main.tsx bootstrap / restoreSession）。
  // 提前 start 会因容器缺席立刻 mount 匹配当前路由的子应用 → died（实测踩坑：
  // 此前 config 校验失败回退 DEFAULT（microApps 空）掩盖了该 race，校验修复后
  // 首次暴露）。rAF 轮询等首帧提交；容器全集 = 本次注册的 container id。
  // rAF 轮询等首帧提交；容器全集按注册配置用 containerId 推导（与上方
  // container 字段同源；不读 RegistrableApp——其类型是 container|render 联合，
  // 取 .container 编译不过）
  const pendingContainers = Object.entries(appConfig.microApps).map(
    ([appName, cfg]) => containerId(appName, cfg.container),
  );
  const gen = startPollGeneration;
  void new Promise<void>((resolve) => {
    const tick = () => {
      if (gen !== startPollGeneration) return resolve(); // 已被 reset 作废
      if (pendingContainers.every((id) => document.getElementById(id))) {
        return resolve();
      }
      requestAnimationFrame(tick);
    };
    tick();
  }).then(() => {
    if (!started || gen !== startPollGeneration) {
      if (gen !== startPollGeneration) return; // reset 过：等新一轮 start
      started = true;
      start({
        // 全局样式隔离（背景与影响面见 QIANKUN_STYLE_ISOLATION_SANDBOX 注释）
        sandbox: QIANKUN_STYLE_ISOLATION_SANDBOX,
        prefetch: (list) => ({
          criticalAppNames: list
            .filter((app) => prefetchNames.has(app.name))
            .map((app) => app.name),
          minorAppsName: [],
        }),
      });
    }
  });
}

// ── 宿主状态（host state）：子应用经 props 读取/订阅 ──────────────────

/**
 * 推送给子应用的全局状态快照（§9.4：只含跨应用共享数据，勿灌整个 store）。
 *
 * 结构 = 跨应用会话字段 + 外观子集（SubAppPreferences）：
 * - token / user / permissions：登录态与权限码
 * - locale：顶层保留（历史契约，已有子应用消费）
 * - preferences：外观子集（类型见 SubAppPreferences，与 setupMicroApps 的
 *   props.preferences 共用同一契约——子应用 mount 经 getter 取值、运行期经
 *   onHostStateChange 收增量，两处结构必须一致）
 */
function snapshot() {
  const preferences = usePreferencesStore.getState();
  return {
    token: useAuthStore.getState().token,
    user: useAuthStore.getState().user,
    permissions: useMenuStore.getState().permissions,
    locale: preferences.app.locale,
    preferences: subAppPreferences(preferences),
  };
}

/**
 * 子应用可见的外观子集（§9.4：只下发外观，不灌整个 preferences store）。
 *
 * 契约（props.preferences 与 snapshot().preferences 共用）：
 * - mode：主题模式 'light' | 'dark' | 'auto'（子应用可派生自身 data-theme）
 * - colorPrimary / colorDestructive / colorSuccess / colorWarning：hsl 字符串
 * - radius：圆角（rem 数值字符串，如 '0.5'）；fontSize：基础字号（px 数值）
 * - colorGrayMode / colorWeakMode：灰色/色弱模式开关
 * - locale：与顶层 locale 同值（子应用取一次 preferences 即可拿全）
 */
export interface SubAppPreferences {
  mode: 'light' | 'dark' | 'auto';
  colorPrimary: string;
  colorDestructive: string;
  colorSuccess: string;
  colorWarning: string;
  radius: string;
  fontSize: number;
  colorGrayMode: boolean;
  colorWeakMode: boolean;
  locale: string;
}

/** 从 preferences store 投影出外观子集（唯一投影点，勿在别处复刻字段清单）。 */
function subAppPreferences(s: {
  theme: {
    mode: 'light' | 'dark' | 'auto';
    colorPrimary: string;
    colorDestructive: string;
    colorSuccess: string;
    colorWarning: string;
    radius: string;
    fontSize: number;
  };
  app: { colorGrayMode: boolean; colorWeakMode: boolean; locale: string };
}): SubAppPreferences {
  return {
    mode: s.theme.mode,
    colorPrimary: s.theme.colorPrimary,
    colorDestructive: s.theme.colorDestructive,
    colorSuccess: s.theme.colorSuccess,
    colorWarning: s.theme.colorWarning,
    radius: s.theme.radius,
    fontSize: s.theme.fontSize,
    colorGrayMode: s.app.colorGrayMode,
    colorWeakMode: s.app.colorWeakMode,
    locale: s.app.locale,
  };
}

export type HostState = ReturnType<typeof snapshot>;
export type HostStateListener = (state: HostState, prev: HostState) => void;

const hostStateListeners = new Set<HostStateListener>();

let hostStateSyncStarted = false;

/** 当前全局状态快照（子应用 props / 订阅回调均取它）。 */
export function getHostState(): HostState {
  return snapshot();
}

/** 订阅宿主全局状态变化；返回取消订阅函数。fireImmediately=true 时先以当前快照回调一次。 */
export function onHostStateChange(
  listener: HostStateListener,
  fireImmediately = false,
) {
  if (typeof listener !== 'function') {
    console.error('[micro] onHostStateChange 需要传入回调函数');
    return () => {};
  }
  hostStateListeners.add(listener);
  if (fireImmediately) {
    const current = snapshot();
    listener(current, current);
  }
  return () => {
    hostStateListeners.delete(listener);
  };
}

const hostStateUnsubscribes: Array<() => void> = [];

/** 仅供测试：重置宿主状态同步（解绑 store 订阅、清空订阅者）。 */
export function __resetHostStateForTest() {
  hostStateSyncStarted = false;
  hostStateUnsubscribes.splice(0).forEach((off) => off());
  hostStateListeners.clear();
}

/**
 * 宿主状态单向同步（只在 main.tsx 一处 init）：auth/menu/preferences 三个
 * store 的 subscribe → 快照对比 → 有变化才通知子应用（zustand subscribe 无
 * selector 时每次 setState 都触发，由引用比对兜住，避免无谓重渲染）。
 *
 * 外观字段（theme.mode/colorPrimary/... 与 app.colorGrayMode/colorWeakMode）
 * 都收在 preferences 子集对象里：投影函数每次调用都返回新对象，子集引用比对
 * 恒为不等——误推所有无关偏好变更（如 sidebar collapsed）。故这里不能比对
 * preferences 对象引用，必须逐字段比对外观子集；只有任一字段真变才通知。
 */
export function setupHostState() {
  if (hostStateSyncStarted) return;
  hostStateSyncStarted = true;
  let prev = snapshot();
  const pushIfChanged = () => {
    const next = snapshot();
    const p = next.preferences;
    const q = prev.preferences;
    if (
      next.token !== prev.token ||
      next.user !== prev.user ||
      next.permissions !== prev.permissions || // permissions 每次重算为新数组，引用比对即够
      next.locale !== prev.locale ||
      // 外观子集逐字段比对（投影每次返回新对象，对象引用比对恒为不等）
      p.mode !== q.mode ||
      p.colorPrimary !== q.colorPrimary ||
      p.colorDestructive !== q.colorDestructive ||
      p.colorSuccess !== q.colorSuccess ||
      p.colorWarning !== q.colorWarning ||
      p.radius !== q.radius ||
      p.fontSize !== q.fontSize ||
      p.colorGrayMode !== q.colorGrayMode ||
      p.colorWeakMode !== q.colorWeakMode
      // p.locale 与顶层 next.locale 同源，无需重复比对
    ) {
      const changedFrom = prev;
      prev = next;
      // 复制后遍历：回调内取消订阅（如子应用 unmount）不影响本轮派发
      for (const listener of [...hostStateListeners])
        listener(next, changedFrom);
    }
  };
  hostStateUnsubscribes.push(
    useAuthStore.subscribe(pushIfChanged),
    useMenuStore.subscribe(pushIfChanged),
    usePreferencesStore.subscribe(pushIfChanged),
  );
}

/**
 * App 顶层挂载一次：global-logout 事件 → 跳登录页（§5.3）。
 * 注意：事件由 handleLogout 派发（清理已完成），此处**只导航**——
 * 若在这里再调 handleLogout 会再次派发同一事件 → 无限循环。
 * 返回清理函数（测试用）。
 */
export function watchGlobalLogout(navigate: (path: string) => void) {
  const handler = () => navigate(appConfig.auth.loginPath);
  window.addEventListener('global-logout', handler);
  return () => window.removeEventListener('global-logout', handler);
}

// 子应用登录页（public 路由）登录成功后把会话交还宿主：
// 复用幂等的 bootstrapSession（token/menus/permissions 入库 + 注册其余子应用）。
// 子应用拿到 resolved promise 后自行 navigate 交还路由控制权。
export async function onLoginSuccess(params: {
  token: string;
  refreshToken?: string;
  user?: UserInfo;
}): Promise<void> {
  await bootstrapSession(params.token, params.refreshToken, params.user);
  const from = new URLSearchParams(window.location.search).get('from') ?? '';
  const target = from && !isAuthPath(from) ? from : appConfig.route.homePath;
  window.history.pushState({}, '', target);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export { clearStoredTokens };

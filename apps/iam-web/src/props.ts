/*
 * 子应用 props 契约与状态 —— main.tsx 与业务模块（api 层）共享的轻量模块。
 *
 * 从 main.tsx 抽出（任务 11-03）：api 层的 apiPrefix() 需要 getProps()，而
 * main.tsx 顶层有 render() 副作用（qiankun 生命周期挂载）——jsdom 测试环境
 * import api 模块会连带执行入口（Target container is not a DOM element）。
 * 类型 + 模块级状态无副作用，独立成文件后 api 层的 import 链不再经过入口。
 *
 * 跨应用契约按形状对齐宿主（apps/portal-web/src/micro/register.ts），不 import。
 */

/** 宿主下发的偏好外观子集（getter，每次 mount 取最新值）。 */
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
  /**
   * 集成态显式 API 前缀（部署期直连 Supabase 时由部署 config.js 传 ''：宿主共享
   * 实例的 endpoint 已含完整路径，再拼 basename 派生前缀会双前缀 404）。
   * **空串合法**——解析按 `typeof === 'string'` 判定而非真值（见 api/prefix.ts）；
   * 未传回退 props.basename 派生，dev 的宿主 config.js 不传该键、行为不变。
   */
  apiPrefix?: string;
  /** 宿主通知通道：子应用把 toast 消息上抛给宿主 ToastRegion 渲染（缺省 = 独立态本地渲染） */
  onNotify?: (
    message: string,
    level?: 'error' | 'warning' | 'success' | 'info',
  ) => void;
  /** 宿主当前会话 token（getter 语义，mount 时取最新） */
  token?: string;
  /** 宿主菜单树派生的权限码数组（getter 语义，见 register.ts flattenPermissions） */
  permissions?: string[];
  /** 宿主运行时图标注册（config.js icons 内联包；iconPackUrl 由宿主 fetch 后合并） */
  icons?: Record<string, { viewBox?: string; paths: string[]; fill?: string }>;
  /** 宿主运行时语言包（config.js i18n.packUrls；键 = 语言代码，值 = JSON URL） */
  i18n?: { packUrls?: Record<string, string> };
  [key: string]: unknown;
}

let savedProps: PltProps = {};

/** 取最新 props（qiankun mount 时写入；独立态恒为空对象）。 */
export function getProps(): PltProps {
  return savedProps;
}

/** qiankun mount 时暂存（由 main.tsx 调用；业务模块经 getProps 读取）。 */
export function setProps(props: PltProps): void {
  savedProps = props;
}

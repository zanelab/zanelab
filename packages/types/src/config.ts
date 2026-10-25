import { z } from 'zod';

// 运行时配置的 schema（docs/技术方案.md §3.1）。类型用 z.infer 推导，
// 不另写 interface，避免双份维护（.trellis/spec/frontend/type-safety.md）。

export const SystemConfigSchema = z.object({
  name: z.string(),
  /** 英文系统名（可选）：语言为英文时页签标题等展示用；不配则沿用 name */
  nameEn: z.string().optional(),
  logo: z.string(),
  favicon: z.string(),
});

export const AuthConfigSchema = z.object({
  loginPath: z.string(),
  tokenKey: z.string(),
  refreshTokenKey: z.string(),

  /** 登录页 UI 开关（部署期可调，免重编译） */
  loginPage: z
    .object({
      layout: z.enum(['panel-center', 'panel-left', 'panel-right']),
      showCodeLogin: z.boolean(),
      showQrcodeLogin: z.boolean(),
      showThirdPartyLogin: z.boolean(),
      showRegister: z.boolean(),
      showForgetPassword: z.boolean(),
      showRememberMe: z.boolean(),
      /** 登录页右上「切换主题色」按钮显隐 */
      showColorToggle: z.boolean().default(true),
      /** 登录页右上「切换面板布局」按钮显隐 */
      showLayoutToggle: z.boolean().default(true),
    })
    .default({
      layout: 'panel-right',
      showCodeLogin: true,
      showQrcodeLogin: true,
      showThirdPartyLogin: true,
      showRegister: true,
      showForgetPassword: true,
      showRememberMe: true,
      showColorToggle: true,
      showLayoutToggle: true,
    }),
});

export const ApiConfigSchema = z.object({
  baseURL: z.string(),
  menusEndpoint: z.string(),
  loginEndpoint: z.string(),
  logoutEndpoint: z.string().optional(),
  refreshEndpoint: z.string().optional(),
  /** dev 环境是否启用 MSW mock（false=走真实后端经 Vite proxy） */
  useMock: z.boolean().default(false),
});

export const RouteConfigSchema = z.object({
  homePath: z.string(),
  forbiddenPath: z.string(),
  notFoundPath: z.string(),
});

// 布局/主题：部署期唯一来源，由 main.tsx 映射进 preferences store（同名偏好先以
// layout 为准，preferences.* 中显式给出的同名字段仍然优先 —— 一般不必再写一遍）。
//   theme          → preferences.theme.mode（枚举只有 light/dark；
//                    要跟随系统的 'auto' 只能写 preferences.theme.mode）
//   layout         → preferences.app.layout（LayoutMode）
//   authPageLayout → preferences.app.authPageLayout
//   fixedHeader    → preferences.header.mode（true='fixed' / false='static'）
//   showBreadcrumb → preferences.breadcrumb.enable
export const LayoutConfigSchema = z.object({
  /** 主布局模式（与 types/layout.ts LayoutMode 对齐） */
  theme: z.enum(['light', 'dark']),
  layout: z
    .enum([
      'sidebar-nav',
      'mixed-nav',
      'sidebar-mixed-nav',
      'header-nav',
      'full-content',
      'header-mixed-nav',
      'header-sidebar-nav',
    ])
    .default('sidebar-nav'),
  fixedHeader: z.boolean(),
  showBreadcrumb: z.boolean(),
});

export const MicroAppConfigSchema = z.object({
  name: z.string(),
  entry: z.string(),
  container: z.string(),
  activeRule: z.string(),
  props: z.record(z.string(), z.unknown()).default({}),
  prefetch: z.boolean().default(false),
  // 免鉴权声明：true = 整个 activeRule 前缀免登录（如承载登录页的子应用）；
  // 或路径数组 = 仅列出的 activeRule 子路径免登录（如 home 的 ['/home']）。
  public: z.union([z.boolean(), z.array(z.string())]).default(false),
});

/**
 * 图标数据（运行时图标注册表，09-08-icon-registry）：只收 path data，
 * 不收任意 SVG 文本——path data 无法表达脚本/事件（XSS 边界），且以
 * stroke=currentColor 渲染、天然跟主题色。viewBox 缺省 '0 0 24 24'。
 */
export const IconDataSchema = z.object({
  viewBox: z.string().optional(),
  paths: z.array(z.string()).min(1),
  /** fill 模式（iconfont 风格）：设为 'currentColor' 时用 fill 渲染，不设时用 stroke */
  fill: z.string().optional(),
});

/**
 * 运行时语言包懒加载（菜单 i18nKey 的补充翻译源）：键 = 语言代码（如 'zh-CN'），
 * 值 = 语言包 JSON 的 URL（嵌套 key 树，格式同内置语言包）。语言包通常较大，
 * config 只放 URL——切换到对应语言时才 fetch，深合并进 translation 命名空间：
 * 新增 key 兜住内置包缺失的菜单 i18nKey，同名 key 覆盖内置文案（与 iconPackUrl 同思路）。
 */
export const I18nConfigSchema = z.object({
  packUrls: z.record(z.string(), z.string()).default({}),
});

/**
 * 偏好设置部署期配置（public/config.js 的 preferences）：结构与壳 preferences store
 * （src/stores/preferences-store.ts 的 PreferencesState）分组一致，启动时按分组浅合并
 * 覆盖进 store，优先级高于本地缓存 —— 清空缓存后仍生效。未列出的字段沿用默认值。
 *
 * 值用 z.unknown() 收（只做「是对象」这一层约束）：字段集合由 store 定义，此处不重复
 * 维护一份易失配的镜像 schema；类型不对的分组由 store 侧取值时兜底。
 */
export const PreferencesConfigSchema = z
  .record(z.string(), z.unknown())
  .default({});

export const AppConfigSchema = z.object({
  version: z.string(),
  system: SystemConfigSchema,
  auth: AuthConfigSchema,
  api: ApiConfigSchema,
  route: RouteConfigSchema,
  layout: LayoutConfigSchema,
  /** 偏好设置部署期覆盖（见 PreferencesConfigSchema 注释） */
  preferences: PreferencesConfigSchema,
  microApps: z.record(z.string(), MicroAppConfigSchema).default({}),
  /** 运行时图标注册（内联包）：键 = 后端菜单 icon 标识符。部署期改 config.js 即生效，免重编译 */
  icons: z.record(z.string(), IconDataSchema).default({}),
  iconPackUrl: z.string().optional(),
  i18n: I18nConfigSchema.default({ packUrls: {} }),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type MicroAppConfig = z.infer<typeof MicroAppConfigSchema>;
export type IconData = z.infer<typeof IconDataSchema>;

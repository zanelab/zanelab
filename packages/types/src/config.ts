import { z } from 'zod';

export const SystemConfigSchema = z.object({
  name: z.string(),

  nameEn: z.string().optional(),
  logo: z.string(),
  favicon: z.string(),
});

export const AuthConfigSchema = z.object({
  loginPath: z.string(),
  tokenKey: z.string().default('portal_token'),
  refreshTokenKey: z.string().default('portal_refresh_token'),
});

export const ApiConfigSchema = z.object({
  baseURL: z.string(),
  menusEndpoint: z.string(),
  userInfoEndpoint: z.string(),
  loginEndpoint: z.string(),
  logoutEndpoint: z.string().optional(),
  refreshEndpoint: z.string().optional(),

  otpEndpoint: z.string().optional(),

  useMock: z.boolean().default(false),

  agentBaseURL: z.string().default('/agent/api/v1'),

  userPerEndpoint: z.string().default('/home/user/getUserPer'),

  powerAgentEndpoint: z.string().default('/share/findPowerAgent'),
});

export const RouteConfigSchema = z.object({
  homePath: z.string(),
  forbiddenPath: z.string(),
  notFoundPath: z.string(),
});

export const LayoutConfigSchema = z.object({
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

  authPageLayout: z
    .enum(['panel-center', 'panel-left', 'panel-right'])
    .default('panel-right'),
  fixedHeader: z.boolean(),
  showBreadcrumb: z.boolean(),
});

export const SessionConfigSchema = z.object({
  showPlatformManagement: z.boolean().default(true),

  showTenantManagement: z.boolean().default(true),

  showTenantSwitcher: z.boolean().default(true),
});

export const MicroAppConfigSchema = z.object({
  name: z.string(),
  entry: z.string(),
  container: z.string(),
  activeRule: z.string(),
  props: z.record(z.string(), z.unknown()).default({}),
  prefetch: z.boolean().default(false),
});

export const IconDataSchema = z.object({
  viewBox: z.string().optional(),
  paths: z.array(z.string()).min(1),

  fill: z.string().optional(),
});

export const I18nConfigSchema = z.object({
  packUrls: z.record(z.string(), z.string()).default({}),
});

export const PreferencesConfigSchema = z
  .record(z.string(), z.unknown())
  .default({});

export const SupabaseConfigSchema = z.object({
  url: z.string().url(),
  anonKey: z.string().min(1),
});

export const AppConfigSchema = z.object({
  version: z.string(),
  system: SystemConfigSchema,
  auth: AuthConfigSchema,
  supabase: SupabaseConfigSchema,
  api: ApiConfigSchema,
  route: RouteConfigSchema,
  layout: LayoutConfigSchema,

  preferences: PreferencesConfigSchema,
  session: SessionConfigSchema,
  microApps: z.record(z.string(), MicroAppConfigSchema).default({}),

  icons: z.record(z.string(), IconDataSchema).default({}),

  iconPackUrl: z.string().optional(),

  i18n: I18nConfigSchema.default({ packUrls: {} }),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type MicroAppConfig = z.infer<typeof MicroAppConfigSchema>;
export type IconData = z.infer<typeof IconDataSchema>;

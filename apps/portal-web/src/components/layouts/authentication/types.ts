export type ToolbarType = 'color' | 'language' | 'layout' | 'theme';

export interface AuthPageLayoutProps {
  appName?: string;
  logo?: string;
  logoDark?: string;
  pageTitle?: string;
  pageDescription?: string;
  sloganImage?: string;
  toolbar?: boolean;
  copyright?: boolean;
  toolbarList?: ToolbarType[];
  clickLogo?: () => void;

  /** #toolbar slot 覆盖（reference authentication.vue:60-64） */
  slotToolbar?: React.ReactNode;

  /** #logo slot 覆盖（reference authentication.vue:81-104） */
  slotLogo?: React.ReactNode;

  /** #copyright slot 覆盖（reference authentication.vue:71-78/145-152/162-169） */
  slotCopyright?: React.ReactNode;

  /** 路由视图内容（RouterView 等价：当前认证页面表单） */
  children?: React.ReactNode;
}

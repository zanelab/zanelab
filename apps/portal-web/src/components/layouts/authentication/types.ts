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

  slotToolbar?: React.ReactNode;

  slotLogo?: React.ReactNode;

  slotCopyright?: React.ReactNode;

  children?: React.ReactNode;
}

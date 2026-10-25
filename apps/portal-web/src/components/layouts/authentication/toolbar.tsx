import { usePreferencesStore } from '../../../stores/preferences-store';
import type { ToolbarType } from './types';
import {
  AuthenticationColorToggle,
  AuthenticationLayoutToggle,
  LanguageToggle,
  ThemeToggle,
} from '../widgets';

interface ToolbarProps {
  toolbarList?: ToolbarType[];
}

/**
 * Toolbar — 1:1 port of authentication/toolbar.vue.
 * 主题色 / 登录页面板布局（md 以上）/ 语言 / 明暗切换，位置 absolute top-4 right-2。
 */
export function Toolbar({
  toolbarList = ['color', 'language', 'layout', 'theme'],
}: ToolbarProps) {
  const preferences = usePreferencesStore();

  const showColor = toolbarList.includes('color');
  const showLayout = toolbarList.includes('layout');
  const showLanguage = toolbarList.includes('language');
  const showTheme = toolbarList.includes('theme');

  return (
    <div
      className={`flex-center absolute top-4 right-2 z-10 ${
        toolbarList.length > 1 ? 'bg-accent rounded-3xl px-3 py-1' : ''
      }`}
    >
      {/* Only show on medium and larger screens */}
      <div className="hidden md:flex">
        {showColor ? <AuthenticationColorToggle /> : null}
        {showLayout ? <AuthenticationLayoutToggle /> : null}
      </div>
      {/* Always show Language and Theme toggles */}
      {showLanguage && preferences.widget.languageToggle ? (
        <LanguageToggle />
      ) : null}
      {showTheme && preferences.widget.themeToggle ? <ThemeToggle /> : null}
    </div>
  );
}

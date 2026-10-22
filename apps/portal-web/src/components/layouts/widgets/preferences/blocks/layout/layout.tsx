import { useTranslation } from 'react-i18next';
import { AppIcon } from '../../../../../icons/app-icon';
import {
  SidebarNav,
  SidebarMixedNav,
  HeaderNav,
  HeaderSidebarNav,
  MixedNav,
  HeaderMixedNav,
  FullContent,
} from '../../icons';

const PRESET = [
  { type: 'sidebar-nav', icon: SidebarNav },
  { type: 'sidebar-mixed-nav', icon: SidebarMixedNav },
  { type: 'header-nav', icon: HeaderNav },
  { type: 'header-sidebar-nav', icon: HeaderSidebarNav },
  { type: 'mixed-nav', icon: MixedNav },
  { type: 'header-mixed-nav', icon: HeaderMixedNav },
  { type: 'full-content', icon: FullContent },
];

interface LayoutProps {
  value: string;
  onChange: (value: string) => void;
}

export function Layout({ value, onChange }: LayoutProps) {
  const { t } = useTranslation();
  return (
    <div className="flex w-full flex-wrap gap-5">
      {PRESET.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.type}
            className="flex w-25 cursor-pointer flex-col"
            onClick={() => onChange(item.type)}
          >
            <div
              className={`outline-box flex-center ${
                value === item.type ? 'outline-box-active' : ''
              }`}
            >
              <Icon />
            </div>
            <div className="flex-center text-base-content/60 hover:text-base-content mt-2 text-center text-xs">
              {t(`preferences.layoutMode.${item.type}`)}
              <span
                className="tooltip ml-1"
                data-tip={t(`preferences.layoutMode.tips.${item.type}`)}
              >
                <AppIcon
                  name="circle-help"
                  className="text-base-content/50 size-3 cursor-help"
                />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

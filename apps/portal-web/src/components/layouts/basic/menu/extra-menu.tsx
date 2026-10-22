import type { MenuRecordRaw } from '@zanelab/types';
import type { MenuProps } from '../../../menu';
import { Menu } from '../../../menu';
import { useLocation } from 'react-router-dom';
import { getRouteMeta } from '../../../../router/route-meta';
import { useNavigation } from './use-navigation';

interface LayoutExtraMenuProps extends MenuProps {
  menus?: MenuRecordRaw[];
}

export function LayoutExtraMenu({
  accordion = true,
  collapse,
  menus = [],
  rounded,
  theme,
}: LayoutExtraMenuProps) {
  const location = useLocation();
  const { navigation } = useNavigation();

  async function handleSelect(key: string) {
    await navigation(key);
  }

  return (
    <Menu
      accordion={accordion}
      collapse={collapse}
      defaultActive={
        getRouteMeta(location.pathname)?.activePath || location.pathname
      }
      menus={menus}
      mode="vertical"
      rounded={rounded}
      theme={theme}
      onSelect={handleSelect}
    />
  );
}

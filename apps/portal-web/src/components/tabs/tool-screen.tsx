import type { FC } from 'react';
import { AppIcon } from '../icons/app-icon';

interface ToolScreenProps {
  screen?: boolean;
  onScreenChange?: (screen: boolean) => void;
}

export const ToolScreen: FC<ToolScreenProps> = ({ screen, onScreenChange }) => {
  const toggle = () => onScreenChange?.(!screen);

  return (
    <div
      className="flex-center border-base-300 text-base-content/60 hover:bg-base-200 hover:text-base-content h-full cursor-pointer border-l px-2 text-lg font-semibold"
      onClick={toggle}
    >
      {screen ? (
        <AppIcon name="minimize" className="size-4" />
      ) : (
        <AppIcon name="maximize" className="size-4" />
      )}
    </div>
  );
};

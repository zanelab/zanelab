import type { FC } from 'react';
import { AppIcon } from '../icons/app-icon';

interface ToolRefreshProps {
  onRefresh?: () => void;
}

export const ToolRefresh: FC<ToolRefreshProps> = ({ onRefresh }) => {
  return (
    <div
      className="flex-center border-base-300 text-base-content/60 hover:bg-base-200 hover:text-base-content h-full cursor-pointer border-l px-2 text-lg font-semibold"
      onClick={() => onRefresh?.()}
    >
      <AppIcon name="refresh-cw" className="size-4" />
    </div>
  );
};

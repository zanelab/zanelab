import { AppIcon } from '../../icons/app-icon';

interface SidebarCollapseButtonProps {
  collapsed: boolean;
  onCollapsedChange: (value: boolean) => void;
}

/**
 * SidebarCollapseButton — toggle collapse/expand of the sidebar.
 * Ported from layout-ui widgets/sidebar-collapse-button.vue
 */
export function SidebarCollapseButton({
  collapsed,
  onCollapsedChange,
}: SidebarCollapseButtonProps) {
  const handleCollapsed = () => {
    onCollapsedChange(!collapsed);
  };

  return (
    <div
      className="flex-center bg-accent text-foreground/60 hover:bg-accent-hover hover:text-foreground absolute bottom-2 left-3 z-10 cursor-pointer rounded-sm p-1"
      onClick={(e) => {
        e.stopPropagation();
        handleCollapsed();
      }}
    >
      {collapsed ? (
        <AppIcon name="chevrons-right" className="size-4" />
      ) : (
        <AppIcon name="chevrons-left" className="size-4" />
      )}
    </div>
  );
}

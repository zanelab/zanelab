import { AppIcon } from '../../icons/app-icon';

interface SidebarFixedButtonProps {
  expandOnHover: boolean;
  onExpandOnHoverChange: (value: boolean) => void;
}

export function SidebarFixedButton({
  expandOnHover,
  onExpandOnHoverChange,
}: SidebarFixedButtonProps) {
  const toggleFixed = () => {
    onExpandOnHoverChange(!expandOnHover);
  };

  return (
    <div
      className="flex-center bg-accent text-foreground/60 hover:bg-accent-hover hover:text-foreground absolute right-3 bottom-2 z-10 cursor-pointer rounded-sm p-1.25 transition-all duration-300"
      onClick={toggleFixed}
    >
      {expandOnHover ? (
        <AppIcon name="pin" className="size-3.5" />
      ) : (
        <AppIcon name="pin-off" className="size-3.5" />
      )}
    </div>
  );
}

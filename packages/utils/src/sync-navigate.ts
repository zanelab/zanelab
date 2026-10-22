import { flushSync } from 'react-dom';

export function syncNavigate(
  navigate: (to: string, options?: { replace?: boolean }) => void,
  to: string,
  options?: { replace?: boolean },
): void {
  flushSync(() => navigate(to, options));
}

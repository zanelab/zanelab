import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRouteMeta } from '../../../../router/route-meta';

export function useNavigation() {
  const navigate = useNavigate();

  function isHttpUrl(path: string): boolean {
    return /^https?:\/\//.test(path);
  }

  function shouldOpenInNewWindow(path: string): boolean {
    if (isHttpUrl(path)) return true;
    const meta = getRouteMeta(path);

    return !!(meta?.link || meta?.openInNewWindow);
  }

  function resolveHref(path: string): string {
    return path;
  }

  const navigation = useCallback(
    async (path: string) => {
      try {
        const meta = getRouteMeta(path);
        const { openInNewWindow = false, query = {}, link } = meta ?? {};

        if (link && typeof link === 'string') {
          window.open(link, '_blank', 'noopener,noreferrer');
          return;
        }

        if (isHttpUrl(path)) {
          window.open(path, '_blank', 'noopener,noreferrer');
        } else if (openInNewWindow) {
          window.open(resolveHref(path), '_blank', 'noopener,noreferrer');
        } else {
          navigate({ pathname: path, search: toSearch(query) });
        }
      } catch (error) {
        console.error('Navigation failed:', error);
        throw error;
      }
    },
    [navigate],
  );

  const willOpenedByWindow = useCallback((path: string) => {
    return shouldOpenInNewWindow(path);
  }, []);

  return { navigation, willOpenedByWindow };
}

function toSearch(query: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  }
  const search = params.toString();
  return search ? `?${search}` : '';
}

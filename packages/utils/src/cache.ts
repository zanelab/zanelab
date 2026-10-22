interface CacheEntry {
  __timeout: number;
  __data: unknown;
}

const PREFIX = 'cache_';

export const cache = {
  get<T = unknown>(key: string): T | null {
    const data = localStorage.getItem(PREFIX + key);
    try {
      if (!data) return null;
      return (JSON.parse(data) as CacheEntry)?.__data as T;
    } catch {
      return null;
    }
  },

  set(key: string, value: unknown, hours = 24): void {
    const timeout = Date.now() + hours * 3600 * 1000;
    const entry: CacheEntry = { __timeout: timeout, __data: value };
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  },

  remove(key: string): void {
    if (!key) return;
    localStorage.removeItem(PREFIX + key);
  },
};

export default cache;

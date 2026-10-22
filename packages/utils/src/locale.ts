export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const;

export function normalizeLocale(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const bcp47 = value.trim().replace(/_/g, '-');
  if (!bcp47) return undefined;
  return SUPPORTED_LOCALES.find(
    (locale) => locale.toLowerCase() === bcp47.toLowerCase(),
  );
}

export function toLegacyLocale(locale: string): string {
  return locale.replace(/-/g, '_');
}

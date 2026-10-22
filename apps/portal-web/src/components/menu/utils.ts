export function isUrl(path: string): boolean {
  return /^https?:\/\//.test(path);
}

export function isExternal(path: string): boolean {
  return /^(https?:|mailto:|tel:)/.test(path);
}

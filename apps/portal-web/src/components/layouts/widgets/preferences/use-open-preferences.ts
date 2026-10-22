import { useSyncExternalStore } from 'react';

let openPreferences = false;
const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function getSnapshot() {
  return openPreferences;
}

export function useOpenPreferences() {
  const open = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    openPreferences: open,
    setOpenPreferences: (val: boolean) => {
      openPreferences = val;
      listeners.forEach((fn) => fn());
    },
    handleOpenPreferences: () => {
      openPreferences = true;
      listeners.forEach((fn) => fn());
    },
  };
}

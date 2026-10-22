import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TimezoneOption {
  label: string;
  value: string;
}

const DEFAULT_TIME_ZONE_OPTIONS: TimezoneOption[] = [
  { label: 'America/New_York(GMT-5)', value: 'America/New_York' },
  { label: 'Europe/London(GMT0)', value: 'Europe/London' },
  { label: 'Asia/Shanghai(GMT+8)', value: 'Asia/Shanghai' },
  { label: 'Asia/Tokyo(GMT+9)', value: 'Asia/Tokyo' },
  { label: 'Asia/Seoul(GMT+9)', value: 'Asia/Seoul' },
];

export function getCurrentTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

interface TimezoneState {
  timezone: string;

  setTimezone: (timezone: string) => Promise<void>;

  getTimezoneOptions: () => Promise<TimezoneOption[]>;
}

export const useTimezoneStore = create<TimezoneState>()(
  persist(
    (set) => ({
      timezone: getCurrentTimezone(),
      setTimezone: async (timezone: string) => {
        set({ timezone });
      },
      getTimezoneOptions: async () => DEFAULT_TIME_ZONE_OPTIONS,
    }),
    {
      name: 'core-timezone',
      partialize: (state) => ({ timezone: state.timezone }),
    },
  ),
);

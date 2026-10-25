import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TimezoneOption {
  label: string;
  value: string;
}

/** 等价于 上游 preferences 包 DEFAULT_TIME_ZONE_OPTIONS */
const DEFAULT_TIME_ZONE_OPTIONS: TimezoneOption[] = [
  { label: 'America/New_York(GMT-5)', value: 'America/New_York' },
  { label: 'Europe/London(GMT0)', value: 'Europe/London' },
  { label: 'Asia/Shanghai(GMT+8)', value: 'Asia/Shanghai' },
  { label: 'Asia/Tokyo(GMT+9)', value: 'Asia/Tokyo' },
  { label: 'Asia/Seoul(GMT+9)', value: 'Asia/Seoul' },
];

/** 等价于 上游 shared 工具包 getCurrentTimezone */
export function getCurrentTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

interface TimezoneState {
  /** 当前时区 */
  timezone: string;

  /** 设置时区 */
  setTimezone: (timezone: string) => Promise<void>;

  /** 获取时区选项 */
  getTimezoneOptions: () => Promise<TimezoneOption[]>;
}

/**
 * useTimezoneStore — 1:1 port of stores/modules/timezone.ts (Pinia → zustand).
 * 时区持久化（persist: pick ['timezone'] 等价）；
 * 自定义 handler（getTimezone/setTimezone 远端读取）在 React port 中
 * 默认使用 DEFAULT_TIME_ZONE_OPTIONS / 本地持久化。
 * 有意未移植：dayjs 时区集成（reference initTimezone/setCurrentTimezone
 * 的 dayjs.tz.setDefault —— port 无依赖 dayjs 的日期渲染，无需全局默认时区）、
 * $reset（zustand 无对应惯例，偏重置走 preferences 重置链路）、选项的
 * offset 字段（无消费者，列表仅展示用）。
 */
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

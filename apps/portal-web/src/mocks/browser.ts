import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// 浏览器环境 MSW：仅在 dev 启用（main.tsx 条件引入）。
export const worker = setupWorker(...handlers);

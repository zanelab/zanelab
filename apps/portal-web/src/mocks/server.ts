import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Node 测试环境 MSW：由 src/test/setup.ts 启停。
export const server = setupServer(...handlers);

import { setupServer } from 'msw/node';
import { skillHandlers } from './skill-handlers';

// Node 测试环境 MSW（iam-web src/mocks/server.ts 同模式）：
// 由 src/test/setup.ts 起 stop；handlers = skills 自身全部 mock 契约。
export const server = setupServer(...skillHandlers);

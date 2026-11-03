import { setupServer } from 'msw/node';
import { iamOtpHandlers } from './otp-handlers';
import { iamMenuHandlers } from './menu-handlers';

// Node 测试环境 MSW（与 portal-web src/mocks/server.ts 同模式）：
// 由 src/test/setup.ts 起 stop；handlers = iam 自身全部 mock 契约。
export const server = setupServer(...iamOtpHandlers, ...iamMenuHandlers);

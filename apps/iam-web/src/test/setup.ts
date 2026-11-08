import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from '../mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
// cleanup：RTL 的 auto-cleanup 依赖 vitest globals（本仓未开 globals: true），
// 不显式清会让上一用例的 DOM 叠进下一用例——screen 查询的是整个 body，
// 三个用例的表格叠加后 getAllByText 全部重复（2026-11-03 实测踩坑）。
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from '../mocks/server';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
}
globalThis.ResizeObserver =
  ResizeObserverMock as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView =
  Element.prototype.scrollIntoView ?? (() => {});

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

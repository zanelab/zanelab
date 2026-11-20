import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// RTL 的 auto-cleanup 依赖 vitest globals（本仓未开 globals: true），
// 不显式清会让上一用例的 DOM 叠进下一用例（iam-web 同款踩坑）。
afterEach(() => cleanup());

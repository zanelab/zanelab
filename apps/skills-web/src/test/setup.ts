import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from '../mocks/server';
import { setupI18n } from '../locales/i18n';
import { resetSkillMock } from '../mocks/skill-handlers';

// i18n：所有页面组件消费 useTranslation()——未初始化时 t() 返回 key 本身，
// 中文断言全部落空（11-23-skills-i18n-radius）。全局以缺省 zh-CN 初始化一次，
// 译文与抽出的硬编码文案逐字一致 → 既有测试的字面量断言不改。
// 单测里要切语言/验懒加载的用例自行 changeLanguage / __resetMessagePacksForTest。
setupI18n();

// MSW（11-23-skills-crud-mock）：api 层测试经本 server 拦截 mock 契约；
// 未注册 handler 的请求按 error 报——契约缺口在测试期立即暴露（iam 同款）。
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetSkillMock();
});
afterAll(() => server.close());

import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { setupI18n } from '../locales/i18n';

// i18n：所有页面组件消费 useTranslation()——未初始化时 t() 返回 key 本身，
// 中文断言全部落空（11-23-skills-i18n-radius）。全局以缺省 zh-CN 初始化一次，
// 译文与抽出的硬编码文案逐字一致 → 既有测试的字面量断言不改。
// 单测里要切语言/验懒加载的用例自行 changeLanguage / __resetMessagePacksForTest。
setupI18n();

// RTL 的 auto-cleanup 依赖 vitest globals（本仓未开 globals: true），
// 不显式清会让上一用例的 DOM 叠进下一用例（iam-web 同款踩坑）。
afterEach(() => cleanup());

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n, {
  __resetMessagePacksForTest,
  injectMessagePacks,
  loadMessagePack,
  resolveSkillsLocale,
  setLocale,
  setupI18n,
} from './i18n';

beforeEach(async () => {
  // 每用例回到缺省 zh-CN（setup.ts 已全局 setupI18n；changeLanguage 幂等对齐）
  await i18n.changeLanguage('zh-CN');
});

afterEach(() => {
  __resetMessagePacksForTest();
  vi.restoreAllMocks();
});

describe('resolveSkillsLocale', () => {
  it('支持横线与下划线两种格式（zh_CN 旧格式与宿主归一化规则一致）', () => {
    expect(resolveSkillsLocale('zh-CN')).toBe('zh-CN');
    expect(resolveSkillsLocale('zh_CN')).toBe('zh-CN');
    expect(resolveSkillsLocale('en-US')).toBe('en-US');
    expect(resolveSkillsLocale('en_US')).toBe('en-US');
  });

  it('未下发 / 非支持语言 → null（调用方落缺省）', () => {
    expect(resolveSkillsLocale(undefined)).toBeNull();
    expect(resolveSkillsLocale('')).toBeNull();
    expect(resolveSkillsLocale('fr-FR')).toBeNull();
  });
});

describe('setupI18n（幂等）/ setLocale', () => {
  it('复挂载（isInitialized）只对齐语言不重复 init', () => {
    setupI18n('en-US');
    expect(i18n.language).toBe('en-US');
    setupI18n('zh-CN');
    expect(i18n.language).toBe('zh-CN');
  });

  it('setLocale 未下发 / 非支持语言 → no-op（保持当前语言）', () => {
    expect(i18n.language).toBe('zh-CN');
    setLocale(undefined);
    setLocale('fr-FR');
    expect(i18n.language).toBe('zh-CN');
  });

  it('setLocale 同值 → no-op（宿主快照全量推送，locale 未变不得触发 changeLanguage）', async () => {
    await i18n.changeLanguage('en-US');
    const spy = vi.spyOn(i18n, 'changeLanguage');
    setLocale('en-US');
    expect(spy).not.toHaveBeenCalled();
    setLocale('zh-CN');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('语言包懒加载（props.i18n.packUrls）', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // afterEach restoreAllMocks 后原 spy 引用失效——每用例重新挂
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    __resetMessagePacksForTest();
    warnSpy.mockClear();
  });

  it('未注入 URL → no-op，消费回退内置文案', async () => {
    await loadMessagePack('en-US');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('注入 URL → fetch 并深合并；已加载过不再请求（幂等）', async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ skills: { market: { title: 'Packed Title' } } }),
          {
            status: 200,
          },
        ),
    );
    vi.stubGlobal('fetch', fetchSpy);
    injectMessagePacks({ 'en-US': '/packs/en-US.json' });
    await loadMessagePack('en-US');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(i18n.t('skills.market.title', { lng: 'en-US' })).toBe(
      'Packed Title',
    );
    await loadMessagePack('en-US'); // 已加载 → no-op
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('fetch 失败 → console.warn 静默降级内置文案', async () => {
    // 上一用例深合并过 en-US 的 mock 包——先摘掉 en-US 包验证「加载失败 →
    // 不新增包内容」（__resetMessagePacks 只清 bookkeeping，不清 store；
    // removeResourceBundle 会连内置包一起摘——摘后 t(en) 回退 fallbackLng
    // zh-CN 的内置文案，恰好同为「内置语言包兜底」语义的直接验证）
    i18n.removeResourceBundle('en-US', 'translation');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 500 })),
    );
    injectMessagePacks({ 'en-US': '/packs/en-US.json' });
    await loadMessagePack('en-US');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    // fetch 失败未 addResourceBundle → en-US 无包 → 回退 fallback（zh-CN 内置）
    expect(i18n.t('skills.market.title', { lng: 'en-US' })).toBe(
      'Agent Skills 市场',
    );
  });
});

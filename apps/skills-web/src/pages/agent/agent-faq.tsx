import { useTranslation } from 'react-i18next';

/**
 * FAQ 区块（参考站「Agent Skills 常见问题」）：5 问 details/summary 可开合，
 * 文案在语言包（原文自参考站抓取，见任务 research/）。
 */
export function AgentFaq() {
  const { t } = useTranslation();
  const items = [
    'support',
    'different',
    'sharedDir',
    'vsMcp',
    'noTerminal',
  ] as const;

  return (
    // 通栏（页面底色；参考站 section[10] py-16 sm:py-24）
    <section className="py-16 sm:py-24">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-6 px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-[28px] leading-[1.1] font-semibold tracking-[-0.04em] text-balance md:text-[40px]">
          {t('skills.agent.faq.title')}
        </h2>
        <div className="flex w-full max-w-[900px] flex-col gap-3">
          {items.map((key) => (
            <details
              key={key}
              className="border-base-300 bg-base-100 rounded-xl border"
            >
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium">
                {t(`skills.agent.faq.q.${key}`)}
              </summary>
              <p className="text-base-content/70 border-base-200 border-t px-4 py-3 text-sm leading-relaxed">
                {t(`skills.agent.faq.a.${key}`)}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

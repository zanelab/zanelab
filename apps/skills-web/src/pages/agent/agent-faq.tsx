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
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{t('skills.agent.faq.title')}</h2>
      <div className="flex flex-col gap-3">
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
    </section>
  );
}

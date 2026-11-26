import { useTranslation } from 'react-i18next';
import { AgentChips } from './agent-chips';
import { AgentTable } from './agent-table';
import { AgentFaq } from './agent-faq';
import { FeaturedSkills } from './featured-skills';
import { WhatIsSkillMd } from './what-is-skillmd';
import { AGENT_CATALOG } from './data';

/**
 * Agent 目录页（参考站 /zh/skills/agent）：六区块 1:1 还原——
 * 标语区 → agent logo 横条 → 精选 skills 卡片区 → SKILL.md 支持对比表 →
 * FAQ → SKILL.md 介绍段。
 *
 * 容器 max-w-[1120px]（与 marketplace footer 同宽）；区块间距 gap-16。
 */
export function AgentPage() {
  const { t } = useTranslation();

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 py-10">
      <div className="flex flex-col gap-16">
        {/* ① 标语区 */}
        <header className="flex flex-col gap-3">
          <p className="text-base-content/50 text-xs font-medium tracking-wide uppercase">
            {t('skills.agent.subtitle', { count: AGENT_CATALOG.length })}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {t('skills.agent.heading')}
          </h1>
          <p className="text-base-content/70 max-w-3xl text-sm leading-relaxed">
            {t('skills.agent.intro')}
          </p>
        </header>

        {/* ② agent logo 横条 */}
        <AgentChips />

        {/* ③ 精选 skills 卡片区 */}
        <FeaturedSkills />

        {/* ④ SKILL.md 支持对比表 */}
        <AgentTable />

        {/* ⑤ FAQ */}
        <AgentFaq />

        {/* ⑥ SKILL.md 介绍段 */}
        <WhatIsSkillMd />
      </div>
    </main>
  );
}

import type { CSSProperties } from 'react';
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
 * **版式对齐参考站**（任务 11-26-skills-agent-page-visual；**配色不参考**，
 * 沿用本站 daisyUI 主题）：
 * - 容器 max-w-[1440px] + 左右 32px 内边距
 * - Hero：小标题 13px / H1 72px 字距 -0.05em / 段落 19px max-w-760px —— 全居中
 * - 区块标题 h2：40px 字距 -0.04em 居中（参考站四个区块均居中）
 * - 字体 Bricolage Grotesque **页面级 scoped**（根容器设 font-family，
 *   不改 body —— 避免影响 marketplace 等既有页面的排版）
 */

/** 参考站字体（页面级 scoped；仅本页根容器生效）。 */
const PAGE_FONT = "'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif";

export function AgentPage() {
  const { t } = useTranslation();

  return (
    <main
      className="mx-auto w-full max-w-[1440px] px-8 py-12"
      style={{ fontFamily: PAGE_FONT } as CSSProperties}
    >
      <div className="flex flex-col gap-20">
        {/* ① 标语区（居中大标题版式） */}
        <header className="flex flex-col items-center gap-5 text-center">
          <p className="text-base-content/60 text-[13px] font-semibold tracking-wide uppercase">
            {t('skills.agent.subtitle', { count: AGENT_CATALOG.length })}
          </p>
          <h1 className="text-[40px] leading-[1.05] font-semibold tracking-[-0.05em] text-balance md:text-[72px]">
            {t('skills.agent.heading')}
          </h1>
          <p className="text-base-content/70 max-w-[760px] text-[19px] leading-relaxed">
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

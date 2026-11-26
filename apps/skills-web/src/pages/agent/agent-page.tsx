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
 * SKILL.md 介绍段 → FAQ。
 *
 * **版式对齐参考站**（任务 11-26-skills-agent-page-visual / -layout；
 * **配色不参考**，沿用本站 daisyUI 主题）：
 * - **通栏结构**：外层 `main` 不设 max-width（区块背景延伸到整屏），
 *   每个区块内部自己带 `mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8`
 *   ——参考站 section 背景是通栏的，只有内容定宽（见「什么是」白底段
 *   `bg-white/60` 横贯整屏）。
 * - 区块背景交替：卡片区与「什么是 SKILL.md」段用**亮色底**
 *   （本站 `bg-base-200`），对比表与 FAQ 用页面底色。
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
    <main style={{ fontFamily: PAGE_FONT } as CSSProperties}>
      {/* ① 标语区（居中大标题版式） */}
      <header className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-5 px-4 py-10 text-center sm:px-6 lg:px-8 lg:py-16">
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
      <div className="mx-auto w-full max-w-[1440px] px-4 pb-8 sm:px-6 lg:px-8">
        <AgentChips />
      </div>

      {/* ③ 精选 skills 卡片区 —— 亮色底通栏 */}
      <FeaturedSkills />

      {/* ④ SKILL.md 支持对比表 */}
      <AgentTable />

      {/* ⑤ SKILL.md 介绍段 —— 亮色底通栏（参考站在 FAQ 之前） */}
      <WhatIsSkillMd />

      {/* ⑥ FAQ */}
      <AgentFaq />
    </main>
  );
}

import { useTranslation } from 'react-i18next';

/**
 * 「什么是 SKILL.md Skill?」介绍段：三个子点 + YAML frontmatter 示例块。
 *
 * YAML 示例是**代码示例**（技术内容，非 UI 文案）——放语言包会让示例随语言
 * 变，且引号/换行转义脆弱；故作常量留在组件侧，语言包里只放说明文案。
 */
const YAML_SAMPLE = `---
name: inclusive-cutpaper-deck
description: Editorial workshop slides with cut-paper collages.
  Use when the user asks for a workshop or team deck.
---
# How to build the deck
1. Read references/layouts.md …`;

const POINTS = ['openFormat', 'writeOnce', 'loadOnDemand'] as const;

export function WhatIsSkillMd() {
  const { t } = useTranslation();
  return (
    // 通栏亮色底（参考站 section[9]: bg-white/60 py-16 sm:py-24）
    <section className="bg-base-200 py-16 sm:py-24">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-6 px-4 sm:px-6 lg:px-8">
        <div className="flex max-w-[860px] flex-col items-center gap-3 text-center">
          <h2 className="text-[28px] leading-[1.1] font-semibold tracking-[-0.04em] text-balance md:text-[40px]">
            {t('skills.agent.what.title')}
          </h2>
          <p className="text-base-content/60 max-w-[760px] text-[15px] leading-relaxed">
            {t('skills.agent.what.intro')}
          </p>
        </div>

        <div className="grid w-full max-w-[1200px] grid-cols-1 gap-4 md:grid-cols-3">
          {POINTS.map((key) => (
            <div key={key} className="border-base-300 rounded-xl border p-4">
              <h3 className="text-sm font-semibold">
                {t(`skills.agent.what.point.${key}.title`)}
              </h3>
              <p className="text-base-content/70 mt-1.5 text-[13px] leading-relaxed">
                {t(`skills.agent.what.point.${key}.body`)}
              </p>
            </div>
          ))}
        </div>

        {/* SKILL.md frontmatter 示例（代码示例常量，不入语言包） */}
        <pre className="border-base-300 bg-base-100 w-full max-w-[900px] overflow-x-auto rounded-[14px] border p-5 text-[13px] leading-relaxed">
          <code>{YAML_SAMPLE}</code>
        </pre>
      </div>
    </section>
  );
}

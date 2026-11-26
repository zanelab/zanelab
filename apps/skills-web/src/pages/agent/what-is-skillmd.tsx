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
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">
          {t('skills.agent.what.title')}
        </h2>
        <p className="text-base-content/60 mt-1 text-sm">
          {t('skills.agent.what.intro')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
      <pre className="border-base-300 bg-base-200 overflow-x-auto rounded-xl border p-4 text-[12px] leading-relaxed">
        <code>{YAML_SAMPLE}</code>
      </pre>
    </section>
  );
}

/**
 * 页脚营销区文案与派生数据（footer 三个 section 的唯一内容承载，组件零文案）。
 *
 * i18n（任务 11-23-skills-i18n-radius）：文案全部在语言包（skills.footer.*），
 * 本模块改为**工厂函数**——各 section 组件在渲染期传 t() 调用，切语言后
 * useTranslation 触发重渲染时重新取译文（模块顶层常量会把语言冻结在首次
 * import，i18n 规范「模块顶层不落带文案的数据」）。
 *
 * 文案口径：以参考站 skillry.dev/zh/skills 页脚为底稿改写（任务决策 B2）——
 * 凡涉及 Skillry 品牌、会员计划、CLI/ZIP 安装、"采集站对比"的表述按本项目实际改写；
 * 数字从 ../data.ts 派生（总数 / 免费数 / agent 数），不写死第二份事实源。
 * 分类入口与大卡条目均为纯展示（决策 B3）：不挂路由、不触发筛选、无箭头。
 */

import type { TFunction } from 'i18next';
import { AGENT_LABEL, FILTER_GROUPS, SKILLS } from '../data';

/** 派生计数（演示种子口径；接真后端后此处随接口层迁移） */
const total = SKILLS.length;
const freeCount = SKILLS.filter((skill) => skill.free).length;
const agentCount = Object.keys(AGENT_LABEL).length;

export interface OverviewFeature {
  icon: string;
  title: string;
  description: string;
}

export interface BrowseEntry {
  icon: string;
  title: string;
  description: string;
}

export interface BrowseCard {
  heading: string;
  /** 条目主标签；第二行为副题（可空），纯展示 */
  items: Array<{ label: string; sublabel?: string }>;
}

export interface FaqItem {
  question: string;
  answer: string;
}

/** 第 1 段：什么是 Agent Skills 市场？ */
export function overviewSection(t: TFunction) {
  return {
    title: t('skills.footer.overview.title'),
    description: t('skills.footer.overview.description'),
    features: [
      {
        icon: 'table',
        // 「共」前缀避开与页首计数徽章「N 个 Skills」的精确文本碰撞：
        // 既有测试用 getByText 唯一性断言，页脚必须不产生同名文本
        title: t('skills.footer.overview.features.total.title', {
          count: total,
        }),
        description: t('skills.footer.overview.features.total.description'),
      },
      {
        icon: 'download',
        title: t('skills.footer.overview.features.free.title', {
          count: freeCount,
        }),
        description: t('skills.footer.overview.features.free.description'),
      },
      {
        icon: 'components',
        title: t('skills.footer.overview.features.agent.title', {
          count: agentCount,
        }),
        description: t('skills.footer.overview.features.agent.description'),
      },
      {
        icon: 'corner-down-left',
        title: t('skills.footer.overview.features.manage.title'),
        description: t('skills.footer.overview.features.manage.description'),
      },
    ] satisfies OverviewFeature[],
  };
}

/** 第 2 段：浏览 Agent Skills 库 */
export function browseSection(t: TFunction) {
  return {
    title: t('skills.footer.browse.title'),
    description: t('skills.footer.browse.description'),
    entries: [
      {
        icon: 'presentation',
        title: t('skills.footer.browse.entries.slides.title'),
        description: t('skills.footer.browse.entries.slides.description'),
      },
      {
        icon: 'monitor',
        title: t('skills.footer.browse.entries.web.title'),
        description: t('skills.footer.browse.entries.web.description'),
      },
      {
        icon: 'video',
        title: t('skills.footer.browse.entries.video.title'),
        description: t('skills.footer.browse.entries.video.description'),
      },
      {
        icon: 'photo',
        title: t('skills.footer.browse.entries.image.title'),
        description: t('skills.footer.browse.entries.image.description'),
      },
    ] satisfies BrowseEntry[],
    cards: [
      {
        heading: t('skills.footer.browse.cards.agent.heading'),
        // 标签 = AGENT_LABEL 全称（单一事实源；品牌名不翻译）；参考站的
        // "所有支持 SKILL.md 的 agent" 汇总条目是外链，不实现
        items: Object.values(AGENT_LABEL).map((label) => ({
          label,
          sublabel: t('skills.footer.browse.cards.agent.sublabel'),
        })),
      },
      {
        heading: t('skills.footer.browse.cards.role.heading'),
        // 值域复用 FILTER_GROUPS 的 role 组选项，不新造
        // （label 渲染期解析：role 组中文值是数据键，走 skills.option.role.* 译文）
        items: (
          FILTER_GROUPS.find((group) => group.id === 'role')?.options ?? []
        ).map((option) => ({
          label: t(`skills.option.role.${option.value}`),
          sublabel: undefined,
        })),
      },
    ] satisfies BrowseCard[],
  };
}

/** 第 3 段：Agent Skills 市场常见问题（5 条） */
export function faqSection(t: TFunction) {
  return {
    title: t('skills.footer.faq.title'),
    items: ['what', 'free', 'install', 'agents', 'contribute'].map((key) => ({
      question: t(`skills.footer.faq.items.${key}.question`),
      answer: t(`skills.footer.faq.items.${key}.answer`),
    })) satisfies FaqItem[],
  };
}

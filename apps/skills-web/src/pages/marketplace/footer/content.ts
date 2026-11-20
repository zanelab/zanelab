/**
 * 页脚营销区文案与派生数据（footer 三个 section 的唯一内容承载，组件零文案）。
 *
 * 文案口径：以参考站 skillry.dev/zh/skills 页脚为底稿改写（任务决策 B2）——
 * 凡涉及 Skillry 品牌、会员计划、CLI/ZIP 安装、"采集站对比"的表述按本项目实际改写；
 * 全部数字从 ../data.ts 派生（总数 / 免费数 / agent 数），不写死第二份事实源。
 * 分类入口与大卡条目均为纯展示（决策 B3）：不挂路由、不触发筛选、无箭头。
 */

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
export const OVERVIEW_SECTION = {
  title: '什么是 Agent Skills 市场？',
  description:
    '市场内的每个 Skill 均附带演示说明，让 Claude Code、Codex、Cursor、Antigravity 以及所有能读取 SKILL.md 的 Agent 直接生成网页、幻灯片、视频与图像。',
  features: [
    {
      icon: 'table',
      // 「共」前缀避开与页首计数徽章「N 个 Skills」的精确文本碰撞：
      // 既有测试用 getByText 唯一性断言（AC9 不许改测试），页脚必须不产生同名文本
      title: `共 ${total} 个 Skills`,
      description: '附演示数据与用法说明',
    },
    {
      icon: 'download',
      title: `${freeCount} 个免费`,
      description: '每个输出类型都有免费 Skills，安装与运行方式一致',
    },
    {
      icon: 'components',
      title: `${agentCount} 个 Agent`,
      description: 'Claude Code、Codex、Cursor、Antigravity 等',
    },
    {
      icon: 'corner-down-left',
      title: '同一入口管理',
      description: '在门户内浏览、筛选与安装 Skills',
    },
  ] satisfies OverviewFeature[],
};

/** 第 2 段：浏览 Agent Skills 库 */
export const BROWSE_SECTION = {
  title: '浏览 Agent Skills 库',
  description:
    '按你需要的输出类型、你正在使用的 Coding Agent 或你的角色浏览现成 Skills。',
  entries: [
    {
      icon: 'presentation',
      title: '幻灯片与演示',
      description: '融资路演、课堂教学与汇报',
    },
    {
      icon: 'monitor',
      title: '网页与前端设计',
      description: '落地页、产品界面与作品集',
    },
    {
      icon: 'video',
      title: '视频与动态图形',
      description: '产品宣传片与口播脚本',
    },
    {
      icon: 'photo',
      title: '图片与视觉生成',
      description: '品牌插画、海报与社交卡片',
    },
  ] satisfies BrowseEntry[],
  cards: [
    {
      heading: '按 Coding Agent',
      // 标签 = AGENT_LABEL 全称（单一事实源）；参考站的"所有支持 SKILL.md 的 agent"
      // 汇总条目是外链，不实现
      items: Object.values(AGENT_LABEL).map((label) => ({
        label,
        sublabel: '支持 SKILL.md 的 Agent',
      })),
    },
    {
      heading: '按职业角色',
      // 值域复用 FILTER_GROUPS 的 role 组选项，不新造
      items: (
        FILTER_GROUPS.find((group) => group.id === 'role')?.options ?? []
      ).map((option) => ({ label: option.label, sublabel: undefined })),
    },
  ] satisfies BrowseCard[],
};

/** 第 3 段：Agent Skills 市场常见问题（5 条） */
export const FAQ_SECTION = {
  title: 'Agent Skills 市场常见问题',
  items: [
    {
      question: '什么是 Agent Skills 市场？',
      answer:
        'Agent Skills 市场为 Claude Code、Codex、Cursor、Antigravity 等提供即装即用的 SKILL.md 技能包。本市场为每个 Skill 附带演示数据与用法说明，安装前即可了解其用途与产出效果。',
    },
    {
      question: 'Skills 免费吗？',
      answer:
        '每个输出类型都有可直接安装的免费 Skills。免费与付费 Skills 的安装与运行方式完全一致。',
    },
    {
      question: '怎么从市场里安装 Skill？',
      answer:
        '打开一个 Skill，按其用法说明将 Skill 文件夹交给你的 agent 安装到对应目录，随后即可在会话中使用。',
    },
    {
      question: '这些 Skills 支持哪些 Coding Agent？',
      answer:
        '每个 Skill 都是标准的 SKILL.md 文件夹，因此可以在 Claude Code、Codex、Cursor、Antigravity 以及所有支持 Agent Skills 的 Agent 中直接运行。',
    },
    {
      question: '如何为市场补充新的 Skill？',
      answer:
        '通过页面上方的「上传 skills」入口提交你的 Skill，审核通过后即可上架展示给其他同事使用。',
    },
  ] satisfies FaqItem[],
};

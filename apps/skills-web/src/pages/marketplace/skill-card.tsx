import { useState } from 'react';
import { AppIcon } from '@zanelab/ui';
import { useTranslation } from 'react-i18next';
import { AGENT_LABEL, type OutputType, type SkillItem } from './data';
import { AgentAvatarIcon } from '../agent/agent-icon';
import { Permission } from '../../components/permission';

/**
 * 技能卡片（参考稿网格单元）：无卡片容器——`aspect-video` 缩略图自身承载
 * 圆角与描边，标题在页面底色上另起一行。
 * 三处浮层：左上 免费/付费 徽章、右上 媒体类型圆标、底部深色压边 + 右对齐统计。
 * hover / focus-within 时卡片上浮，右上浮出 喜欢 / 收藏 两个圆钮。
 * 缩略图无真实图（无后端/无静态资源），用语义色渐变占位。
 * 喜欢/收藏无后端，仅页面内本地状态（`aria-pressed` 如实反映，不当已持久化）。
 * 编辑/删除操作钮（11-23-skills-crud-mock R5）：同一 hover 层追加两个圆钮，
 * 各自包 Permission（update/delete 码）——无权限整钮不渲染；点击回调页面层。
 */

const TONE_CLASS: Record<SkillItem['tone'], string> = {
  primary: 'from-primary/25 to-primary/5',
  secondary: 'from-secondary/25 to-secondary/5',
  accent: 'from-accent/25 to-accent/5',
  info: 'from-info/25 to-info/5',
  success: 'from-success/25 to-success/5',
  warning: 'from-warning/25 to-warning/5',
};

/** 输出类型 → 右上圆标图标（BUILTIN_ICONS 内的标识符） */
const OUTPUT_ICON: Record<OutputType, string> = {
  网页: 'monitor',
  幻灯片: 'presentation',
  视频: 'video',
  图像: 'photo',
};

/** 标题行最多展示的头像圆片数，其余折叠为 "+N" */
const MAX_AGENT_AVATARS = 3;

export interface SkillCardProps {
  skill: SkillItem;
  onEdit?: (skill: SkillItem) => void;
  onDelete?: (skill: SkillItem) => void;
}

export function SkillCard({ skill, onEdit, onDelete }: SkillCardProps) {
  const { t } = useTranslation();
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const output = skill.outputTypes[0];
  const shownAgents = skill.agents.slice(0, MAX_AGENT_AVATARS);
  const restAgents = skill.agents.length - shownAgents.length;

  return (
    // isolate（isolation:isolate）把卡内所有浮层的 z-index 收束进卡片自己的层叠上下文：
    // 否则 article 平时只有 position:relative、z-index:auto，位移（-translate-y-1 落到
    // translate 属性上）也仅在 hover/focus-within 时非 none——静止态不建立层叠上下文，
    // 浮层的 z-10/15/20/30 会直接与页面级元素竞争；而 daisyUI 的 .drawer 是
    // position:relative + z-index:auto（同样不建立上下文），小屏打开的 .drawer-side
    // （fixed, z-index:10）就会被卡片浮层（15/20/30）盖住，表现为内容穿透筛选面板。
    <article className="group relative isolate flex h-full min-w-0 flex-col transition-transform duration-300 focus-within:-translate-y-1 hover:-translate-y-1">
      {/* 缩略图：16:9 满铺（自身即卡片外形）。圆角与描边对齐参考站：
          rounded-2xl + black/10（暗色 white/12）——不用 --page-radius 主题
          圆角（参考站卡片是固定 16px 大圆角，与主题控件圆角无关）。 */}
      <div className="border-base-content/10 relative overflow-hidden rounded-2xl border dark:border-white/10">
        <div
          className={`aspect-video w-full bg-gradient-to-br ${TONE_CLASS[skill.tone]}`}
        />

        {/* 左上 免费/付费 徽章（参考站无此徽章——本站定价维度保留） */}
        <span
          className={`badge ${skill.free ? 'badge-primary' : 'badge-neutral'} badge-sm absolute top-2.5 left-2.5 z-20 font-semibold`}
        >
          {skill.free ? t('skills.card.free') : t('skills.card.paid')}
        </span>

        {/* 右上 媒体类型圆标（参考站同款：毛玻璃白底 + hover 隐去——
            hover 时被操作层替代）。 */}
        {output ? (
          <span className="text-base-content/60 dark:text-base-content/80 absolute top-2.5 right-2.5 z-10 grid size-6 place-items-center rounded-full bg-white/50 shadow-[0_3px_10px_rgba(17,18,18,0.10)] backdrop-blur-md transition-opacity duration-200 group-focus-within:opacity-0 group-hover:opacity-0 dark:bg-black/45 dark:shadow-[0_3px_10px_rgba(0,0,0,0.30)] [@media(hover:none)]:opacity-0">
            <AppIcon name={OUTPUT_ICON[output]} className="size-3.5" />
            <span className="sr-only">{t(`skills.outputType.${output}`)}</span>
          </span>
        ) : null}

        {/* 底部深色压边 + 右对齐统计（显式豁免：固定中性黑 + 白字，理由见 design.md）。
            数字对接接口真实数据（skillsApi.list() 的 downloads/bookmarks，
            经 toSkillItem 传入；mock 态走 MSW 种子）。参考站同款 text-shadow。 */}
        <span className="absolute inset-x-0 bottom-0 z-[15] h-16 bg-[linear-gradient(to_top,oklch(0%_0_0/0.72),oklch(0%_0_0/0.6)_32%,transparent)]" />
        <span className="absolute right-3 bottom-2.5 z-20 inline-flex items-center gap-2.5 text-[10px] font-semibold text-white tabular-nums [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
          <span className="inline-flex items-center gap-1">
            <AppIcon name="download" className="size-3" />
            <span className="sr-only">{t('skills.card.installCount')}</span>
            {skill.downloads}
          </span>
          <span className="inline-flex items-center gap-1">
            <AppIcon name="bookmark" className="size-3" />
            <span className="sr-only">{t('skills.card.likeCount')}</span>
            {skill.bookmarks}
          </span>
        </span>

        {/* 右上 hover 操作层：喜欢 / 收藏（浮出时覆盖媒体类型圆标）。
            用 opacity + pointer-events 而非 hidden——hidden 会让按钮无法被 Tab 聚焦，
            focus-within 也就永远不会触发（参考稿按钮是链接内容，本页无链接）。 */}
        <div className="pointer-events-none absolute top-2.5 right-2.5 z-30 flex gap-1 opacity-0 transition-opacity group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
          <button
            type="button"
            aria-label={t('skills.card.like', { title: skill.title })}
            aria-pressed={liked}
            onClick={() => setLiked((v) => !v)}
            className={`btn btn-circle btn-sm btn-ghost bg-base-100/60 backdrop-blur-md ${
              liked ? 'text-base-content' : 'text-base-content/60'
            }`}
          >
            <AppIcon name="heart" className="size-4" />
          </button>
          <button
            type="button"
            aria-label={t('skills.card.bookmark', { title: skill.title })}
            aria-pressed={bookmarked}
            onClick={() => setBookmarked((v) => !v)}
            className={`btn btn-circle btn-sm btn-ghost bg-base-100/60 backdrop-blur-md ${
              bookmarked ? 'text-base-content' : 'text-base-content/60'
            }`}
          >
            <AppIcon name="bookmark" className="size-4" />
          </button>
          {/* 编辑/删除（11-23-skills-crud-mock R5）：有回调且权限码命中才渲染。
              Permissions 在卡片内部判定（而非调用方拆卡）——显隐与卡片 hover 层
              的 DOM 结构强耦合，拆到外面会破坏浮层形态。 */}
          {onEdit ? (
            <Permission code="skills:skill:update">
              <button
                type="button"
                aria-label={t('skills.card.edit', { title: skill.title })}
                onClick={() => onEdit(skill)}
                className="btn btn-circle btn-sm btn-ghost bg-base-100/60 text-base-content/60 hover:text-base-content backdrop-blur-md"
              >
                <AppIcon name="edit" className="size-4" />
              </button>
            </Permission>
          ) : null}
          {onDelete ? (
            <Permission code="skills:skill:delete">
              <button
                type="button"
                aria-label={t('skills.card.delete', { title: skill.title })}
                onClick={() => onDelete(skill)}
                className="btn btn-circle btn-sm btn-ghost bg-base-100/60 text-base-content/60 hover:text-error backdrop-blur-md"
              >
                <AppIcon name="trash" className="size-4" />
              </button>
            </Permission>
          ) : null}
        </div>
      </div>

      {/* 标题行：标题在左，兼容 Agent 头像组在右 */}
      <div className="mt-1.5 flex h-6 items-center gap-2">
        <h3 className="text-base-content/70 min-w-0 truncate text-[13px] font-medium tracking-[-0.01em]">
          {skill.title}
        </h3>
        {/* Agent 头像组（参考站同款）：16px 圆片 + 1px 描边 + **-ml-1 重叠**。
            内层容器不能加 gap——参考站内层 <span class="flex items-center">
            无 gap，重叠全靠项上的 -ml-1（first:ms-0 首项归位）；加了 gap
            会与 -ml-1 正负抵消 → 圆片完全分开、无叠加。
            **不用 daisyUI avatar-group**——它给每个 .avatar 加 4px base-100
            粗白环，内层圆片再带描边 → 双层描边、圆片显得拥挤。 */}
        <span className="ms-auto flex shrink-0 items-center">
          <span className="flex shrink-0 items-center">
            {shownAgents.map((agent) => (
              <span
                key={agent}
                title={AGENT_LABEL[agent] ?? agent}
                data-testid="skill-card-tool-logo"
                className="border-base-content/15 bg-base-100 dark:bg-base-300 -ms-1 grid size-4 shrink-0 place-items-center rounded-full border first:ms-0 dark:border-white/15"
              >
                <AgentAvatarIcon code={agent} size={10} />
              </span>
            ))}
            {restAgents > 0 ? (
              <span className="border-base-content/15 bg-base-100 text-base-content/45 dark:bg-base-300 -ms-1 grid size-4 shrink-0 place-items-center rounded-full border text-[8px] font-semibold tabular-nums dark:border-white/15 dark:text-white/50">
                +{restAgents}
              </span>
            ) : null}
          </span>
        </span>
      </div>
    </article>
  );
}

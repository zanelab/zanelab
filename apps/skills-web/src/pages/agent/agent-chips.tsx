import { useTranslation } from 'react-i18next';
import { FEATURED_AGENTS } from './data';
import { AgentIcon } from './agent-icon';

/**
 * 顶部 agent logo 横条（参考站 hero 下方的 chip 条）：一排 agent 徽标，
 * 点击滚动定位到下方对比表的对应行。
 *
 * 版式对齐参考站（任务 11-26-skills-agent-page-layout）：**白底 + 14px 圆角**
 * 的图标容器（参考站 chip 是白底 72% + 12px 圆角 + 5% 边框；此处按用户
 * 指定的 14px 圆角实现），图标 14px。
 */
export function AgentChips() {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t('skills.agent.chips.aria')}
      className="flex flex-wrap justify-center gap-2.5"
    >
      {FEATURED_AGENTS.map((agent) => (
        <a
          key={agent.code}
          href={`#agent-${agent.code}`}
          title={agent.name}
          aria-label={agent.name}
          className="flex items-center justify-center rounded-[14px] border border-black/[0.08] bg-white p-2 transition-colors hover:bg-white/70 dark:bg-white dark:hover:bg-white/80"
        >
          <AgentIcon agent={agent} size={14} />
        </a>
      ))}
    </nav>
  );
}

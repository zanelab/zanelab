import { useTranslation } from 'react-i18next';
import { FEATURED_AGENTS } from './data';
import { AgentIcon } from './agent-icon';

/**
 * 顶部 agent logo 横条（参考站 hero 下方的 chip 条）：一排 agent 徽标，
 * 点击滚动定位到下方对比表的对应行。
 *
 * 版式对齐参考站（任务 11-26-skills-agent-page-visual）：真实品牌图标 +
 * 圆形底衬；配色不参考，沿用本站主题。
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
          className="border-base-300 hover:border-base-content/30 hover:bg-base-200 flex items-center rounded-full border p-1 transition-colors"
        >
          <AgentIcon agent={agent} size={22} />
        </a>
      ))}
    </nav>
  );
}

import { useTranslation } from 'react-i18next';
import { FEATURED_AGENTS } from './data';

/**
 * 顶部 agent logo 横条（参考站 hero 下方的 chip 条）：一排 agent 徽标，
 * 点击滚动定位到下方对比表的对应行。
 *
 * 本库无品牌 logo 资源——用「首字母缩写方块 + 品牌名」文字 chip（品牌名是
 * 数据非 UI 文案，不入语言包）。
 */
export function AgentChips() {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t('skills.agent.chips.aria')}
      className="flex flex-wrap gap-2"
    >
      {FEATURED_AGENTS.map((agent) => (
        <a
          key={agent.code}
          href={`#agent-${agent.code}`}
          className="border-base-300 hover:border-base-content/30 hover:bg-base-200 flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 transition-colors"
        >
          <span
            aria-hidden
            className="bg-base-300 text-base-content/70 flex size-6 items-center justify-center rounded-full text-[10px] font-semibold"
          >
            {agent.name.slice(0, 2).toUpperCase()}
          </span>
          <span className="text-xs font-medium whitespace-nowrap">
            {agent.name}
          </span>
        </a>
      ))}
    </nav>
  );
}

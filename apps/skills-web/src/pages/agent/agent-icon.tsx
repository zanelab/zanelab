import type { AgentCatalogEntry } from './data';
import { agentAssetUrl } from './asset-url';

/**
 * agent 图标（public/images/agents/ 下的真实品牌图标）。
 *
 * 图标缺失时回退「首字母缩写方块」——不渲染破图（img onError 切换状态）。
 */
export function AgentIcon({
  agent,
  size = 24,
}: {
  agent: AgentCatalogEntry;
  size?: number;
}) {
  if (!agent.icon) {
    return <FallbackMark agent={agent} size={size} />;
  }
  return (
    <img
      src={agentAssetUrl(agent.icon)}
      alt=""
      width={size}
      height={size}
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  );
}

/** 无图标时的首字母方块回退。 */
function FallbackMark({
  agent,
  size,
}: {
  agent: AgentCatalogEntry;
  size: number;
}) {
  return (
    <span
      aria-hidden
      className="bg-base-300 text-base-content/70 flex shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
      style={{ width: size, height: size }}
    >
      {agent.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

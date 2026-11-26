import { useState } from 'react';
import { AGENT_ICON_BY_CODE, type AgentCatalogEntry } from './data';
import { agentIconUrl, isMonochromeAgentIcon } from './agent-icons';

/**
 * agent 图标（src/assets/agents/ 下的真实品牌图标）。
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
      src={agentIconUrl(agent.icon)}
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

/**
 * 按缩写码渲染 agent 品牌图标（marketplace 卡片头像组用）。
 *
 * marketplace 的 skill.agents 存的是缩写码（'CC'/'CX'/…），不是目录条目——
 * 这里经 AGENT_ICON_BY_CODE 反查图标文件名（派生自 AGENT_CATALOG，单一事实源）。
 *
 * **暗色反色**：`fill="currentColor"` 的单色图经 <img> 加载时 currentColor
 * 解析为黑，暗色主题的深色圆底上不可见 → 暗色下对 img 施加 invert 滤镜
 * 翻成白色。自带配色的图标不反色（反色会破坏品牌色）。单色判定由
 * agent-icons.ts 从 SVG 源码自动得出，不手写清单。
 *
 * 加载失败（文件缺失）回退缩写码字母，与 AgentIcon 的回退策略一致——
 * 不渲染破图。
 */
export function AgentAvatarIcon({
  code,
  size = 16,
}: {
  code: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const file = AGENT_ICON_BY_CODE[code];

  if (!file || failed) {
    return (
      <span
        aria-hidden
        className="text-base-content/70 flex shrink-0 items-center justify-center text-[7px] font-semibold"
        style={{ width: size, height: size }}
      >
        {code}
      </span>
    );
  }
  const monochrome = isMonochromeAgentIcon(file);
  return (
    <img
      src={agentIconUrl(file)}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={`shrink-0 object-contain ${monochrome ? 'dark:invert' : ''}`}
      style={{ width: size, height: size }}
    />
  );
}

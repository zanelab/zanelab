import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AGENT_CATALOG, type AgentCatalogEntry } from './data';

/**
 * SKILL.md 支持对比表（参考站核心区块）：分组 tabs（全部/编程/办公 + 支持
 * 提示词安装）+ 5 列表格（Agent/类型/全局 Skills 目录/项目目录/安装方式）。
 *
 * 列内容全是数据（品牌名/厂商/路径不入语言包）；类型与安装方式是枚举文案，
 * 走 t()。办公类「全局/项目目录」两列显示安装设置路径（installHint 或
 * projectPath）。行 id（agent-<code>）供顶部 logo 横条锚点定位。
 */

type TabKey = 'all' | 'programming' | 'office' | 'prompt';

/** 按当前 tab 过滤目录条目。 */
function filterRows(tab: TabKey): AgentCatalogEntry[] {
  if (tab === 'all') return AGENT_CATALOG;
  if (tab === 'prompt')
    return AGENT_CATALOG.filter((a) => a.installMethod === 'prompt');
  return AGENT_CATALOG.filter((a) => a.type === tab);
}

/** 行内路径/code 文本（等宽字体）。 */
function Path({ value }: { value: string }) {
  return (
    <code className="bg-base-200 rounded px-1.5 py-0.5 text-[11px]">
      {value}
    </code>
  );
}

export function AgentTable() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>('all');
  const rows = filterRows(tab);

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'all', label: t('skills.agent.table.tab.all') },
    { key: 'programming', label: t('skills.agent.table.tab.programming') },
    { key: 'office', label: t('skills.agent.table.tab.office') },
    { key: 'prompt', label: t('skills.agent.table.tab.prompt') },
  ];

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{t('skills.agent.table.title')}</h2>
      <p className="text-base-content/60 text-sm">
        {t('skills.agent.table.intro')}
      </p>

      {/* 分组 tabs（参考站胶囊态） */}
      <div
        role="tablist"
        aria-label={t('skills.agent.table.tab.aria')}
        className="flex flex-wrap gap-2"
      >
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
              tab === item.key
                ? 'bg-neutral text-neutral-content'
                : 'border-base-300 text-base-content/60 hover:text-base-content border'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 对比表：小屏横向滚动（路径列长） */}
      <div className="border-base-300 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-base-300 border-b text-xs">
              <th scope="col" className="px-4 py-3 font-semibold">
                {t('skills.agent.table.col.agent')}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t('skills.agent.table.col.type')}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t('skills.agent.table.col.globalPath')}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t('skills.agent.table.col.projectPath')}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t('skills.agent.table.col.install')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((agent) => (
              <tr
                key={agent.code}
                id={`agent-${agent.code}`}
                className="border-base-200 hover:bg-base-200/50 scroll-mt-20 border-b last:border-b-0"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="bg-base-300 text-base-content/70 flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                    >
                      {agent.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold">
                        {agent.name}
                      </div>
                      <div className="text-base-content/50 text-[11px]">
                        {agent.vendor}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="badge badge-ghost badge-sm whitespace-nowrap">
                    {t(`skills.agent.type.${agent.type}`)}
                  </span>
                </td>
                {agent.type === 'programming' ? (
                  <>
                    <td className="px-4 py-3">
                      <Path value={agent.globalPath} />
                    </td>
                    <td className="px-4 py-3">
                      <Path value={agent.projectPath} />
                    </td>
                  </>
                ) : (
                  /* 办公类：两列合并显示设置路径/连接说明（参考站同形——
                     办公行没有目录概念，只有上传入口或连接指令） */
                  <td
                    colSpan={2}
                    className="text-base-content/70 px-4 py-3 text-[12px]"
                  >
                    {agent.installHint ||
                      t('skills.agent.table.settingPath', {
                        path: agent.projectPath,
                      })}
                  </td>
                )}
                <td className="px-4 py-3">
                  <span className="text-primary text-[12px] font-medium whitespace-nowrap">
                    {t(`skills.agent.install.${agent.installMethod}`)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AGENT_CATALOG, type AgentCatalogEntry } from './data';
import { AgentIcon } from './agent-icon';

/**
 * SKILL.md 支持对比表（参考站核心区块）：分组 tabs（全部/编程/办公 + 支持
 * 提示词安装）+ 5 列（Agent/类型/全局 Skills 目录/项目目录/安装方式）。
 *
 * **版式对齐参考站**（任务 11-26-skills-agent-page-visual；配色不参考）：
 * - 表格是 **grid div 行**（非 table 元素）——参考站用 div grid 精确控列宽，
 *   `<table>` 的列宽由内容自动分配，无法对齐参考站的固定比例；
 * - 列宽 lg 起 `315px 150px 339px 266px 180px`，行 padding `16px 24px`；
 * - 行分隔 1px 10% 白线（本站 base-content/10）；
 * - 主体 16px / 路径 13–14px 等宽。
 *
 * **可访问性**：视觉用 grid，语义用 ARIA（role=table/row/columnheader/cell），
 * 保住表头关联（div grid 本会丢失 table 语义）。
 */

type TabKey = 'all' | 'programming' | 'office' | 'prompt';

/** 列宽（lg 起；小屏整表横向滚动）。 */
const COLS = 'grid-cols-[315px_150px_339px_266px_180px]';
/** 表格最小宽（= 列宽和）——小屏 overflow-x-auto 的滚动基准。 */
const TABLE_MIN_W = 'min-w-[1250px]';

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
    <code className="bg-base-200 dark:bg-base-300 rounded-[9px] px-1.5 py-0.5 text-[13px]">
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
    // 通栏（页面底色；参考站 section[8] py-16 sm:py-24）
    <section className="py-16 sm:py-24">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-6 px-4 sm:px-6 lg:px-8">
        <div className="flex max-w-[860px] flex-col items-center gap-3 text-center">
          <h2 className="text-[28px] leading-[1.1] font-semibold tracking-[-0.04em] text-balance md:text-[40px]">
            {t('skills.agent.table.title')}
          </h2>
          <p className="text-base-content/60 max-w-[760px] text-[15px] leading-relaxed">
            {t('skills.agent.table.intro')}
          </p>
        </div>

        {/* 分组 tabs（参考站胶囊态） */}
        <div
          role="tablist"
          aria-label={t('skills.agent.table.tab.aria')}
          className="flex flex-wrap justify-center gap-2"
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
                  ? 'bg-primary text-primary-content'
                  : 'border-base-300 bg-base-100 text-base-content/60 hover:text-base-content dark:bg-base-300 border'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* 对比表：grid div 行（视觉）+ ARIA table 语义 */}
        <div className="border-base-300 dark:bg-base-200 w-full overflow-x-auto rounded-[14px] border bg-white">
          <div role="table" className={TABLE_MIN_W}>
            {/* 表头行 */}
            <div
              role="row"
              className={`border-base-300 text-base-content/60 grid ${COLS} border-b text-[13px] font-medium`}
            >
              {(
                [
                  'agent',
                  'type',
                  'globalPath',
                  'projectPath',
                  'install',
                ] as const
              ).map((col) => (
                <div
                  key={col}
                  role="columnheader"
                  className="px-6 py-4 text-left font-medium"
                >
                  {t(`skills.agent.table.col.${col}`)}
                </div>
              ))}
            </div>

            {/* 数据行 */}
            {rows.map((agent) => (
              <div
                key={agent.code}
                id={`agent-${agent.code}`}
                role="row"
                className={`border-base-content/10 grid ${COLS} scroll-mt-20 border-b last:border-b-0`}
              >
                {/* Agent 列：图标 + 名称 + 厂商 */}
                <div role="cell" className="flex items-center gap-3 px-6 py-4">
                  <AgentIcon agent={agent} size={28} />
                  <div className="min-w-0">
                    <div className="truncate text-[16px] font-medium">
                      {agent.name}
                    </div>
                    <div className="text-base-content/50 truncate text-[12px]">
                      {agent.vendor}
                    </div>
                  </div>
                </div>

                {/* 类型列 */}
                <div role="cell" className="px-6 py-4 text-[16px]">
                  <span className="badge badge-ghost badge-sm whitespace-nowrap">
                    {t(`skills.agent.type.${agent.type}`)}
                  </span>
                </div>

                {agent.type === 'programming' ? (
                  <>
                    {/* 全局 Skills 目录 */}
                    <div role="cell" className="px-6 py-4 text-[14px]">
                      <Path value={agent.globalPath} />
                    </div>
                    {/* 项目目录 */}
                    <div role="cell" className="px-6 py-4 text-[14px]">
                      <Path value={agent.projectPath} />
                    </div>
                  </>
                ) : (
                  /* 办公类：两列合并显示设置路径/连接说明（参考站同形——
                   办同行没有目录概念，只有上传入口或连接指令） */
                  <div
                    role="cell"
                    className="text-base-content/70 col-span-2 px-6 py-4 text-[14px]"
                  >
                    {agent.installHint ||
                      t('skills.agent.table.settingPath', {
                        path: agent.projectPath,
                      })}
                  </div>
                )}

                {/* 安装方式列 */}
                <div role="cell" className="px-6 py-4">
                  <span className="text-primary text-[16px] font-medium whitespace-nowrap">
                    {t(`skills.agent.install.${agent.installMethod}`)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

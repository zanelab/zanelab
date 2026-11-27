import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '@zanelab/ui';
import { Link } from 'react-router-dom';
import { skillsApi } from '../../api/skills';
import { SkillCard } from '../marketplace/skill-card';
import { toSkillItem } from '../marketplace/record';
import type { SkillItem, OutputType } from '../marketplace/data';

/**
 * 精选 skills 卡片区（参考站「每个 agent 都能用的 Skills」）：副文 + 输出类型
 * 筛选 pills + 卡片网格。
 *
 * 数据源复用 marketplace 的 skillsApi.list()（本页独立路由，各自拉一次——
 * 无跨页共享缓存需求）；pills 复用 output 值域（幻灯片/网页/视频/图像 ↔
 * 参考站 PPT/网页/视频/图片）。「浏览全部 Skills」链接回 marketplace 首页。
 */

/** pills 顺序（参考站：全部 / PPT / 网页 / 视频 / 图片） */
const PILLS: Array<OutputType | 'all'> = [
  'all',
  '幻灯片',
  '网页',
  '视频',
  '图像',
];

const CARD_LIMIT = 12;

export function FeaturedSkills() {
  const { t } = useTranslation();
  const [skills, setSkills] = useState<SkillItem[] | null>(null);
  const [pill, setPill] = useState<OutputType | 'all'>('all');

  // 拉取一次（挂载即拉——页面入口区块，等价于 marketplace 的加载时序）
  useEffect(() => {
    let alive = true;
    void skillsApi
      .list()
      .then((rows) => {
        if (alive) setSkills(rows.map(toSkillItem));
      })
      .catch(() => {
        if (alive) setSkills([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const filtered =
    skills === null
      ? null
      : pill === 'all'
        ? skills.slice(0, CARD_LIMIT)
        : skills
            .filter((s) => s.outputTypes.includes(pill))
            .slice(0, CARD_LIMIT);

  return (
    // 通栏亮色底（参考站 section[7]: bg-white/60 + scroll-mt-20 + pb-20 pt-14）
    <section className="bg-base-200 scroll-mt-20 py-14 sm:py-24">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-6 px-4 sm:px-6 lg:px-8">
        <div className="flex max-w-[860px] flex-col items-center gap-3 text-center">
          <h2 className="text-[28px] leading-[1.1] font-semibold tracking-[-0.04em] text-balance md:text-[40px]">
            {t('skills.agent.featured.title')}
          </h2>
          <p className="text-base-content/60 max-w-[760px] text-[15px] leading-relaxed">
            {t('skills.agent.featured.intro')}
          </p>
          {/* 「浏览全部 Skills」入口（参考站同款胶囊 + 右箭头）。
              **用 <Link to="/"> 而非原生 <a>**：应用内路由目标 = 应用根
              （marketplace 首页），而应用根路径由宿主注入的 basename 决定
              （集成态 /skills、独立态 /）。<Link> 由 BrowserRouter 自动补
              basename——原生 <a href="/"> 会跳到宿主根（脱离 basename），
              <a href="."> 则依赖当前 URL 的段数（尾斜杠时会解析错）。
              宿主 props 的 basename 见 main.tsx 的 BrowserRouter 配置。 */}
          <Link
            to="/"
            className="border-base-content/10 bg-base-100 text-base-content hover:bg-base-100/70 inline-flex h-11 w-fit shrink-0 items-center gap-2 rounded-full border px-5 text-[14px] font-semibold transition-colors dark:border-white/15 dark:bg-white/[0.04]"
          >
            {t('skills.agent.featured.browseAll')}
            <AppIcon
              name="svg:M5 12l14 0|M13 18l6 -6|M13 6l6 6"
              className="size-4 shrink-0"
            />
          </Link>
        </div>

        {/* 输出类型 pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {PILLS.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={pill === key}
              onClick={() => setPill(key)}
              className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                pill === key
                  ? 'bg-primary text-primary-content'
                  : 'border-base-300 bg-base-100 text-base-content/60 hover:text-base-content dark:bg-base-300 border'
              }`}
            >
              {key === 'all'
                ? t('skills.agent.featured.all')
                : t(`skills.option.output.${key}`)}
            </button>
          ))}
        </div>

        {/* 卡片网格（复用 marketplace 卡片；目录页不提供编辑/删除入口） */}
        {filtered === null ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-md" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        ) : (
          <div className="border-base-300 text-base-content/50 rounded-(--page-radius) border border-dashed py-12 text-center text-sm">
            {t('skills.market.empty')}
          </div>
        )}
      </div>
    </section>
  );
}

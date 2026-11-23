import { AppIcon } from '@zanelab/ui';
import { useTranslation } from 'react-i18next';
import { overviewSection } from './content';

/**
 * 页脚第 1 段「什么是 Agent Skills 市场？」：
 * 居中段头（h2 24→30px + 说明段）+ 四张特性卡（小屏 1 列 / sm 2 列 / lg 4 列）。
 * 卡片无图片素材 → 上部 aspect-[4/3] 语义色渐变块 + 居中 AppIcon（沿用 D3）；
 * 纯展示：无 hover 位移；无 primary（名额归卡片「免费」徽章，渐变基调也避开）。
 */

const FEATURE_TONE_CLASS = [
  'from-secondary/25 to-secondary/5',
  'from-success/25 to-success/5',
  'from-info/25 to-info/5',
  'from-warning/25 to-warning/5',
];

export function OverviewSection() {
  const { t } = useTranslation();
  const section = overviewSection(t);
  return (
    <div className="flex flex-col items-center gap-7">
      <div className="mx-auto flex max-w-[680px] flex-col items-center gap-2.5 text-center">
        <h2 className="text-base-content text-center text-[24px] leading-[32px] font-semibold tracking-[-0.035em] text-balance sm:text-[30px] sm:leading-[38px]">
          {section.title}
        </h2>
        <p className="text-base-content/60 text-[15px] leading-[25px] text-pretty sm:text-[16px]">
          {section.description}
        </p>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {section.features.map((feature, index) => (
          <div
            key={feature.title}
            className="border-base-300 bg-base-100/75 flex flex-col overflow-hidden rounded-(--page-radius) border"
          >
            {/* 图片位：语义色渐变占位（无真实图素材，D3） */}
            <div
              className={`border-base-300/60 aspect-[4/3] w-full border-b bg-gradient-to-br ${FEATURE_TONE_CLASS[index % FEATURE_TONE_CLASS.length]}`}
            >
              <div className="text-base-content/30 grid h-full w-full place-items-center">
                <AppIcon name={feature.icon} className="size-10" />
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-1 px-4 py-3.5 text-center sm:text-start">
              <h3 className="text-base-content text-[22px] leading-[28px] font-semibold tracking-[-0.03em]">
                {feature.title}
              </h3>
              <p className="text-base-content/60 text-[13px] leading-5">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

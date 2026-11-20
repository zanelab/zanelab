import { BrowseSection } from './browse-section';
import { FaqSection } from './faq-section';
import { OverviewSection } from './overview-section';

/**
 * 市场页页脚营销区（参考站 main > section.mt-16）：三段独立内容，
 * 容器 max-w-[1120px]、段间距统一 gap-16；顶部 border-t 与结果区分隔。
 * 三段均为纯展示（决策 B3）：不消费权限、无 state、无事件。
 * 文案与数字见 ./content.ts（唯一内容承载，组件零文案）。
 */
export function MarketplaceFooter() {
  return (
    <section className="border-base-300 mt-16 border-t pt-14">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-16">
        <OverviewSection />
        <BrowseSection />
        <FaqSection />
      </div>
    </section>
  );
}

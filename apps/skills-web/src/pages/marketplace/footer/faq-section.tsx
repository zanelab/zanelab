import { useTranslation } from 'react-i18next';
import { faqSection } from './content';

/**
 * 页脚第 3 段「Agent Skills 市场常见问题」：5 条 daisyUI `collapse collapse-plus`。
 * 参考 `collapse` 指南：`details/summary` 是其合法承载（自带键盘 Enter/Space 语义、
 * 默认收起）；plus 图标由 `collapse-plus` 自带（group-open 旋转 45°）。
 * 纯展示段：问题 15→16px semibold，答案 15px text-base-content/60。
 */
export function FaqSection() {
  const { t } = useTranslation();
  const section = faqSection(t);
  return (
    <div className="flex flex-col items-center gap-7">
      <div className="mx-auto flex max-w-[720px] flex-col items-center gap-2.5 text-center">
        <h2 className="text-base-content text-center text-[24px] leading-[32px] font-semibold tracking-[-0.035em] text-balance sm:text-[30px] sm:leading-[38px]">
          {section.title}
        </h2>
      </div>

      <div className="w-full space-y-2.5">
        {section.items.map((item) => (
          <details
            key={item.question}
            className="collapse-plus border-base-300 bg-base-100/70 collapse border px-5 py-4"
          >
            <summary className="collapse-title text-base-content cursor-pointer text-[15px] font-semibold sm:text-[16px]">
              {item.question}
            </summary>
            <div className="collapse-content">
              <p className="text-base-content/60 text-[15px] leading-6">
                {item.answer}
              </p>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

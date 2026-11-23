import { AppIcon } from '@zanelab/ui';
import { useTranslation } from 'react-i18next';
import { browseSection } from './content';

/**
 * 页脚第 2 段「浏览 Agent Skills 库」：
 * 居中段头 + 四个分类入口（sm 2 列 / lg 4 列）+ 两张大卡（lg 2 列）。
 * 决策 B3：**全部纯展示**——入口与条目都是 `div` 而非 `a`/`button`，无箭头图标、
 * 无 hover 位移，不暗示可点；大卡也不带参考站的「查看全部」链接。
 * 图标位无真实图 → 52px 语义色渐变块 + AppIcon（沿用 D3）。
 */

const ENTRY_TONE_CLASS = [
  'from-success/25 to-success/5',
  'from-info/25 to-info/5',
  'from-secondary/25 to-secondary/5',
  'from-accent/25 to-accent/5',
];

const CARD_ICON_CLASS = 'from-info/25 to-info/5';
const CARD_ROLE_ICON_CLASS = 'from-warning/25 to-warning/5';

export function BrowseSection() {
  const { t } = useTranslation();
  const section = browseSection(t);
  return (
    <div className="flex flex-col items-center gap-7">
      <div className="mx-auto flex max-w-[720px] flex-col items-center gap-2.5 text-center">
        <h2 className="text-base-content text-center text-[24px] leading-[32px] font-semibold tracking-[-0.035em] text-balance sm:text-[30px] sm:leading-[38px]">
          {section.title}
        </h2>
        <p className="text-base-content/60 text-[15px] leading-[24px] sm:text-[16px]">
          {section.description}
        </p>
      </div>

      {/* 四个分类入口（纯展示 div） */}
      <div className="grid w-full grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {section.entries.map((entry, index) => (
          <div
            key={entry.title}
            className="border-base-300 bg-base-100/75 flex items-center gap-3.5 rounded-(--page-radius) border p-3.5"
          >
            <div
              className={`grid size-[52px] shrink-0 place-items-center rounded-xl bg-gradient-to-br ${ENTRY_TONE_CLASS[index % ENTRY_TONE_CLASS.length]}`}
            >
              <AppIcon
                name={entry.icon}
                className="text-base-content/40 size-5"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-base-content truncate text-[15px] font-semibold">
                {entry.title}
              </span>
              <span className="text-base-content/55 line-clamp-1 text-[12.5px]">
                {entry.description}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 两张大卡（按 Coding Agent / 按职业角色），条目纯展示 */}
      <div className="grid w-full gap-5 lg:grid-cols-2">
        {section.cards.map((card, cardIndex) => (
          <div
            key={card.heading}
            className="border-base-300 bg-base-100/60 flex flex-col gap-3.5 rounded-(--page-radius) border p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-base-content/50 text-[12px] font-semibold tracking-[0.1em] uppercase">
                {card.heading}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {card.items.map((item) => (
                <div
                  key={item.label}
                  className="border-base-300 bg-base-100/85 flex items-center gap-3 rounded-xl border px-3 py-2.5"
                >
                  <div
                    className={`border-base-300 grid shrink-0 place-items-center rounded-[9px] border bg-gradient-to-br p-1 ${cardIndex === 0 ? CARD_ICON_CLASS : CARD_ROLE_ICON_CLASS}`}
                  >
                    <AppIcon
                      name={cardIndex === 0 ? 'components' : 'user'}
                      className="text-base-content/40 size-4"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-base-content block truncate text-[14px] font-medium">
                      {item.label}
                    </span>
                    {item.sublabel ? (
                      <span className="text-base-content/50 block truncate text-[12px]">
                        {item.sublabel}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

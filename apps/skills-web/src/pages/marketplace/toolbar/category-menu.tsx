import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppIcon } from '@zanelab/ui';
import { useTranslation } from 'react-i18next';
import {
  CATEGORY_MENU_ORDER,
  FILTER_GROUPS,
  type SkillFilterGroup,
} from '../data';
import { optionLabel } from '../option-label';
import { FOCUS_RING_CLASS } from './focus-ring';

/**
 * 弹层进出场过渡时长（ms）。与面板的 `motion-safe:duration-[350ms]` 类同步
 * （design.md：0.35s）——closing 相位的卸载定时器依赖它，改值两处一起改。
 */
export const TRANSITION_MS = 350;

/** 弹层生命周期相位：closed 不渲染；entering / open / closing 渲染（见组件头注释） */
type Phase = 'closed' | 'entering' | 'open' | 'closing';

/**
 * 分类下拉（R5/R6）：对齐参考站的两栏 tabbed 弹层 —— 左栏 `role=tablist` 分组、
 * 右栏 `role=tabpanel` 条目，加全页遮罩与缩放淡入。
 *
 * 分层（design.md「四条实现要点」）：
 * - 遮罩 `fixed inset-0 z-40` 经 portal 挂到 body（对齐参考站的门户层），
 *   **控件行**整体 `relative z-50`（见 marketplace.tsx）→ 触发器与行内其它控件
 *   都留在遮罩之上，无需测量工具栏底边；页面其余内容（含桌面侧栏）被压暗。
 * - `dropdown` 是 daisyUI 的受控形态（`dropdown-open` 修饰符 + React state），
 *   不用 `<details>`：条目点击后要程序化关闭。
 * - `.dropdown` 加 `static` 覆盖 daisyUI 的 `position:relative`（Tailwind 工具类
 *   层序在 daisyUI 组件类之上），使弹层的定位基准变成**控件行**而不是触发器：
 *   弹层 `left-0 w-[min(688px,100%)]` 因而始终落在内容列内（任何宽度都不横向溢出）。
 *
 * 关闭路径三条（+ 一条兜底）：点条目（应用筛选值后关闭）、点遮罩、Esc
 * （焦点在控件内时），以及 pointerdown 落在控件之外（遮罩之上仍有行内控件可点）。
 *
 * 焦点管理（AC15）：弹层卸载时若不干预，焦点会掉到 body——键盘用户失去位置锚点。
 * 相位机进 closed 的那一刻把焦点归还触发器（见下方 effect）。
 *
 * 进出场（R5：`scale-90 → 1` + 淡入，0.35s，`cubic-bezier(0.22,1,0.36,1)`，出场反向）：
 * 四相位状态机 closed → entering → open → closing → closed，弹层只在 closed 之外渲染。
 * - 进场：挂载首帧带 start 态类（opacity-0 scale-90），useLayoutEffect 里读一次
 *   getBoundingClientRect 强制浏览器结算 start 样式、再翻终态类——两次样式变更
 *   之间才会启动 CSS transition（挂载即终态、或同帧改类都不触发）。entering 相位
 *   挂 `transition-none`，堵住 daisyUI 的 `@starting-style`（scale:.95）在挂载瞬间
 *   抢跑一条过渡、把进场起点劫持成 .95。
 * - 出场：closing 相位**保留挂载**并切回 start 态类播反向过渡，TRANSITION_MS 后
 *   卸载（定时器在 effect cleanup 清理，关→快速重开不串台）。
 * - 「关闭态不常驻 DOM」的 rationale 依旧成立：卸载后 daisyUI 的 `:focus-within`
 *   展示规则无内容可顶回（Esc 关闭后焦点仍在触发器）。closing 相位内的顶回则由
 *   层序压制：daisyUI 的展示/关闭规则（`opacity:1`、`display:none`）都在
 *   `@layer utilities.daisyui.*` 子层，普通 Tailwind 工具类（opacity-0 / scale-90 /
 *   block）稳定压过——弹层保持可绘制并按我们的透明度淡出；`inert` +
 *   pointer-events-none 同时切断交互（出场途中点条目不得再次改写筛选值）。
 * - `animate-none` 压制 daisyUI 自带的 0.2s `dropdown` keyframe（纯淡入，且 CSS
 *   animation 优先级高于 transition、会劫持 opacity，与 0.35s 缩放过渡冲突）；
 *   过渡参数挂 `motion-safe:` 前缀，`prefers-reduced-motion` 下整体退化为无动画
 *   （类切换瞬时生效，closing 相位仍按时长卸载）。
 */

/** 下拉专用的分组集合：按使用场景 → 按角色 → 按输出类型 → 按 Agent */
const MENU_GROUPS: SkillFilterGroup[] = CATEGORY_MENU_ORDER.map((id) =>
  FILTER_GROUPS.find((group) => group.id === id),
).filter((group): group is SkillFilterGroup => group !== undefined);

/** 条目缩略图位的语义色基调（参考站每条带 32px 缩略图；本应用无静态资源，延续 D3） */
const GROUP_TONE: Record<SkillFilterGroup['id'], string> = {
  free: 'from-secondary/25 to-secondary/5',
  featured: 'from-secondary/25 to-secondary/5',
  scene: 'from-info/25 to-info/5',
  role: 'from-secondary/25 to-secondary/5',
  output: 'from-success/25 to-success/5',
  agent: 'from-accent/25 to-accent/5',
};

/** 条目图标：按输出类型沿用该组选项自带的图标，其余分组按组给一个语义近似的字形 */
const GROUP_ICON: Record<SkillFilterGroup['id'], string> = {
  free: 'check',
  featured: 'circle-check-big',
  scene: 'panel-left',
  role: 'user',
  output: 'monitor',
  agent: 'system',
};

interface CategoryMenuProps {
  /** 受控开合（state 归 marketplace.tsx：控件行的 z 序依赖它） */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  active: Record<string, string[]>;
  onToggle: (group: string, value: string) => void;
}

export function CategoryMenu({
  open,
  onOpenChange,
  active,
  onToggle,
}: CategoryMenuProps) {
  const { t } = useTranslation();
  const [group, setGroup] = useState<SkillFilterGroup['id']>(MENU_GROUPS[0].id);
  const [phase, setPhase] = useState<Phase>('closed');
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  /** 触发器按钮：关闭时把焦点归还给它（AC15 焦点管理） */
  const triggerRef = useRef<HTMLButtonElement>(null);
  const current =
    MENU_GROUPS.find((item) => item.id === group) ?? MENU_GROUPS[0];

  // open → 相位机：打开进 entering；关闭时弹层在场则进 closing（播完出场再卸载），
  // 已是 closed 则保持。用状态机而非「open ? 渲染 : null」是 R5 出场过渡的前提。
  useEffect(() => {
    if (open) {
      setPhase('entering');
    } else {
      setPhase((prev) => (prev === 'closed' ? prev : 'closing'));
    }
  }, [open]);

  // 进场翻转：读一次几何信息强制浏览器结算 start 态样式，同一提交内翻到终态类。
  // jsdom 无布局引擎（读到 0 也无妨）：翻转是同步的，测试只断言类名与行为。
  useLayoutEffect(() => {
    if (phase !== 'entering') return;
    void panelRef.current?.getBoundingClientRect();
    setPhase('open');
  }, [phase]);

  // 出场收尾：过渡播完卸载。cleanup 清定时器——关→快速重开时相位先变、effect
  // 重跑，旧定时器被清掉，不会把重新打开的弹层误卸载。
  useEffect(() => {
    if (phase !== 'closing') return;
    const timer = setTimeout(() => setPhase('closed'), TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (!open) return;
    // 控件行在遮罩之上（行内控件可点），点到行内其它控件时也该收起弹层
    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onOpenChange(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointerDown);
    return () =>
      document.removeEventListener('pointerdown', closeOnOutsidePointerDown);
  }, [open, onOpenChange]);

  // 焦点归还（AC15）：弹层卸载时焦点无处可去会掉到 body——键盘用户失去位置锚点。
  // 在弹层真正卸载的那一刻（phase 转 closed）把焦点还给触发器；此时面板已从
  // DOM 移除，焦点不会又被 inert 的容器截走。
  //
  // 用 useLayoutEffect 而非 useEffect：焦点归还在 DOM 变更后**同步**执行，
  // 早于浏览器绘制与随后的用户输入——passive effect 会晚一拍，键盘用户可能
  // 感知到焦点短暂落在 body 上。
  useLayoutEffect(() => {
    if (phase !== 'closed') return;
    triggerRef.current?.focus();
  }, [phase]);

  const settled = phase === 'open';
  // 过渡参数只在 open / closing 挂（entering 挂 transition-none，见组件头注释）
  const animating = settled || phase === 'closing';

  return (
    <>
      {open
        ? createPortal(
            <div
              id="skills-category-overlay"
              aria-hidden="true"
              onClick={() => onOpenChange(false)}
              className="bg-base-200/70 fixed inset-0 z-40 saturate-[0.8] backdrop-blur-[3px]"
            />,
            document.body,
          )
        : null}

      <div
        ref={rootRef}
        className={`dropdown static ${open ? 'dropdown-open' : ''}`}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onOpenChange(false);
        }}
      >
        {/* SF-1：daisyUI 在「.dropdown 内没有 dropdown-content 兄弟」时对触发器
            :focus 抑制 outline（关闭态弹层已卸载即命中该规则）。utilities 层的
            focus-visible outline 类稳定压过它——键盘焦点环恢复；mouse :focus 的
            抑制保持不变（严格 :focus-visible，不用 :focus）。 */}
        <button
          type="button"
          ref={triggerRef}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? 'skills-category-panel' : undefined}
          className={`border-base-300 bg-base-100 hover:bg-base-content/5 inline-flex h-[42px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold transition-colors ${FOCUS_RING_CLASS}`}
          onClick={() => onOpenChange(!open)}
        >
          {t('skills.toolbar.category')}
          <AppIcon
            name="chevron-down"
            className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {phase !== 'closed' ? (
          <div
            ref={panelRef}
            id="skills-category-panel"
            // 出场途中切断交互：条目不可再点（防二次改写筛选值）、不可聚焦，
            // 也从可访问性树摘除——「关闭中」对 AT 与指针都等价于已关闭
            inert={phase === 'closing'}
            className={[
              // 定位与外观（block 压过 daisyUI 关闭态的 display:none，见组件头注释）
              'dropdown-content border-base-300 bg-base-100 absolute top-full left-0 mt-2 block w-[min(688px,100%)] origin-top animate-none rounded-(--page-radius) border p-2.5 shadow-2xl',
              animating
                ? 'motion-safe:transition-[opacity,scale] motion-safe:duration-[350ms] motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]'
                : 'transition-none',
              settled ? 'scale-100 opacity-100' : 'scale-90 opacity-0',
              phase === 'closing' ? 'pointer-events-none' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[160px_minmax(0,1fr)]">
              {/* 左栏：分组 tablist（选中项浮起，与参考站的分组切换一致） */}
              <div
                role="tablist"
                aria-label={t('skills.toolbar.category')}
                className="bg-base-200 flex flex-col gap-1 rounded-(--page-radius) p-1.5"
              >
                {MENU_GROUPS.map((item) => {
                  const selected = item.id === current.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      id={`cat-tab-${item.id}`}
                      aria-selected={selected}
                      aria-controls={
                        selected ? 'skills-category-tabpanel' : undefined
                      }
                      onClick={() => setGroup(item.id)}
                      className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold tracking-[-0.01em] transition-colors ${
                        selected
                          ? 'bg-base-100 text-base-content shadow-sm'
                          : 'text-base-content/60 hover:bg-base-100/60'
                      }`}
                    >
                      {t(`skills.group.${item.id}`)}
                    </button>
                  );
                })}
              </div>

              {/* 右栏：当前分组的条目（点击 = 应用筛选值 + 关闭弹层） */}
              <div
                role="tabpanel"
                id="skills-category-tabpanel"
                aria-labelledby={`cat-tab-${current.id}`}
                className="border-base-300 bg-base-200/60 flex min-h-[296px] flex-col rounded-(--page-radius) border p-3"
              >
                <div className="grid grid-cols-1 content-start gap-1.5 sm:grid-cols-2">
                  {current.options.map((option) => {
                    const selected = (active[current.id] ?? []).includes(
                      option.value,
                    );
                    return (
                      <button
                        key={option.value}
                        type="button"
                        // 与侧栏共用同一套 toggle 语义（重复点击 = 取消该值），
                        // 故此处如实反映「该筛选值当前是否生效」
                        aria-pressed={selected}
                        onClick={() => {
                          onToggle(current.id, option.value);
                          onOpenChange(false);
                        }}
                        className="group border-base-300 bg-base-100/70 hover:border-base-content/20 hover:bg-base-100 flex h-11 min-w-0 items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors hover:shadow-sm"
                      >
                        <span
                          className={`ring-base-300 grid size-8 shrink-0 place-items-center rounded-[9px] bg-gradient-to-br ring-1 transition-transform group-hover:scale-[1.06] ${
                            GROUP_TONE[current.id]
                          }`}
                        >
                          <AppIcon
                            name={option.icon ?? GROUP_ICON[current.id]}
                            className="text-base-content/60 size-4"
                          />
                        </span>
                        <span className="text-base-content/75 min-w-0 flex-1 truncate">
                          {optionLabel(t, current.id, option.value)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

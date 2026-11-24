/**
 * Modal — 受控弹窗外壳（任务 11-24-skills-modal-package）。
 *
 * 结构对齐参考站（data-attribute 驱动，零第三方依赖）：
 *   div[data-modal-host]
 *   └─ div[data-modal-root]   fixed 定位层（顶部对齐 + 内容超高可滚）
 *      ├─ div[data-modal-scrim]  毛玻璃遮罩（点击 → onOpenChange(false)）
 *      └─ div[role=dialog]       卡片（圆角/阴影/pop 动画）
 *
 * 语义（受控，D2）：
 * - open=false 不挂载（return null）；组件内部绝不自行卸载或缓存 open 态——
 *   关闭时机（scrim 点击 / Escape / 关闭钮）只回调 onOpenChange(false)，
 *   异步提交「成功才关、失败留弹窗」由调用方成功后才改 open 保证。
 * - Escape 经 document keydown 监听（open 期间挂载）；不用原生 <dialog>
 *   showModal()——::backdrop 无法用 Tailwind 类定制，且 jsdom 支持差。
 *
 * 样式：daisyUI/Tailwind 语义 token；圆角走 --page-radius 联动模式
 * （子应用根上由宿主 preferences.radius 注入；非子应用场景用内联 22px 兜底，
 * 会被上层变量自然覆盖）。层级 z-[500]：宿主布局基准 app.zIndex 默认 200
 * （header/sidebar ≈ 200±1），业务模态须盖过宿主 chrome、但低于宿主全局
 * 浮层（global-search z-999 / 锁屏 z-2000 / 偏好抽屉 z-9999）。
 * keyframes/阴影 token 见 ./modal.css
 * （消费方 import '@zanelab/ui/modal.css' 一次，参照 scrollbar.css 先例）。
 */
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AppIcon } from '../icon/app-icon';

export interface ModalProps {
  /** false 时不挂载（受控开关） */
  open: boolean;
  /** scrim 点击 / Escape / 关闭钮触发；关闭时机由调用方决定 */
  onOpenChange: (open: boolean) => void;
  /** 卡片标题元素 id（aria-labelledby 锚点，测试定位用） */
  labelledBy: string;
  title: ReactNode;
  /** header 副标题（可选） */
  description?: ReactNode;
  /** 圆形关闭钮，缺省显示 */
  showClose?: boolean;
  /** 卡片宽度类（缺省 max-w-[640px]；确认类小弹窗传 max-w-[420px] 等） */
  widthClass?: string;
  /** 卡片 body（表单分节由调用方组织） */
  children: ReactNode;
  /** 卡片 footer（配 ModalActions 使用；有值才渲染 footer 条） */
  footer?: ReactNode;
}

export function Modal({
  open,
  onOpenChange,
  labelledBy,
  title,
  description,
  showClose = true,
  widthClass = 'max-w-[640px]',
  children,
  footer,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  // createPortal 到 document.body：qiankun 集成态下弹窗若留在子应用容器内，
  // 会被容器的 stacking context / overflow 裁剪（z-index 相对容器内竞争、
  // 卡片超出容器即滚动条）；挂 body 才是真正的全屏浮层（宿主级 z-[500]）。
  // portal preferences-button 已有同款先例。SSR 安全性：open 受控且本仓
  // 全 CSR，挂载后才可能 open=true。
  return createPortal(
    <div data-modal-host>
      <div
        data-modal-root
        className="fixed inset-0 z-[500] flex items-start justify-center overflow-y-auto p-4 pt-[60px]"
      >
        <div
          data-modal-scrim
          className="modal-fade absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          style={{ '--page-radius': '22px' } as React.CSSProperties}
          className={`modal-pop bg-base-100 border-base-300 shadow-pop relative w-full overflow-hidden rounded-(--page-radius) border ${widthClass}`}
        >
          <div className="border-base-300 flex items-start justify-between gap-4 border-b px-5 py-4">
            <div>
              <h2
                id={labelledBy}
                className="text-base-content text-lg font-semibold"
              >
                {title}
              </h2>
              {description ? (
                <p className="text-base-content/60 mt-0.5 text-[12.5px]">
                  {description}
                </p>
              ) : null}
            </div>
            {showClose ? (
              <button
                type="button"
                aria-label="Close"
                onClick={() => onOpenChange(false)}
                className="text-base-content/60 hover:bg-base-content/5 hover:text-base-content grid size-8 shrink-0 place-items-center rounded-full transition-colors"
              >
                <AppIcon name="close" className="size-4" />
              </button>
            ) : null}
          </div>

          <div>{children}</div>

          {footer ? (
            <div className="border-base-300 bg-base-200/50 border-t px-5 py-4">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

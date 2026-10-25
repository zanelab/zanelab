import { useRef, useEffect, useCallback } from 'react';

interface CollapseTransitionProps {
  show: boolean;
  children: React.ReactNode;
}

/**
 * CollapseTransition — 1:1 port of menu-ui collapse-transition.vue.
 *
 * reference 以 Vue <transition> 包裹 `v-show="opened"` 的 ul —— 内容
 * **始终挂载**（display 切换，无卸载）：关闭态的子菜单项保持注册
 * （initMenu 据此在挂载时展开激活路由的父级）。React 等价：恒渲染
 * child，以 display:none + max-height 过渡呈现，不引入卸载路径 ——
 * 卸载会触发注册表移除 → registryVersion 变化 → 展开 effect 重跑，
 * 与 reference 的 DOM/注册语义背离。
 *
 * 不引入额外 wrapper（wrapper 会打断 .admin-sub-menu > .admin-menu >
 * .admin-menu-item 的子代选择器链，menu.css）。
 *
 * 钩子序列（collapse-transition.vue）：
 * - 初次渲染：无动画（<transition> 无 appear），按 show 直接 display
 * - show false→true：beforeEnter（记录旧 padding/margin，清零 +
 *   maxHeight 0）→ enter（rAF 后 maxHeight=scrollHeight，恢复
 *   padding/margin，overflow hidden）→ afterEnter（maxHeight/overflow 复原）
 * - show true→false：beforeLeave（maxHeight=scrollHeight，overflow hidden）
 *   → leave（rAF 后清零）→ afterLeave（复原 + display:none）
 *
 * CSS（transition.css:223-236）：0.2s max-height/padding/margin
 * ease-in-out —— 由 .admin-collapse-transition 类承担（menu.css）。
 */
export function CollapseTransition({
  show,
  children,
}: CollapseTransitionProps) {
  const elRef = useRef<HTMLElement | null>(null);
  // 过渡代数：快速 true→false→true 切换时，使在途过渡的收尾（复位样式 /
  // display:none）失效，等价 <transition> 对被中断过渡的取消语义
  const genRef = useRef(0);
  const initialRef = useRef(true);
  const showRef = useRef(show);
  showRef.current = show;

  /** beforeEnter：记录旧值并清零（collapse-transition.vue:26-43） */
  function beforeEnter(el: HTMLElement) {
    el.dataset.oldPaddingTop = el.style.paddingTop;
    el.dataset.oldMarginTop = el.style.marginTop;
    el.dataset.oldPaddingBottom = el.style.paddingBottom;
    el.dataset.oldMarginBottom = el.style.marginBottom;
    if (el.style.height) el.dataset.elExistsHeight = el.style.height;

    el.style.maxHeight = '0';
    el.style.paddingTop = '0';
    el.style.marginTop = '0';
    el.style.paddingBottom = '0';
    el.style.marginBottom = '0';
  }

  /** enter：rAF 后展开（collapse-transition.vue:45-66） */
  function enter(el: HTMLElement) {
    const gen = ++genRef.current;
    requestAnimationFrame(() => {
      el.dataset.oldOverflow = el.style.overflow;
      if (el.dataset.elExistsHeight) {
        el.style.maxHeight = el.dataset.elExistsHeight;
      } else if (el.scrollHeight === 0) {
        el.style.maxHeight = '0';
      } else {
        el.style.maxHeight = `${el.scrollHeight}px`;
      }

      el.style.paddingTop = el.dataset.oldPaddingTop ?? '';
      el.style.paddingBottom = el.dataset.oldPaddingBottom ?? '';
      el.style.marginTop = el.dataset.oldMarginTop ?? '';
      el.style.marginBottom = el.dataset.oldMarginBottom ?? '';
      el.style.overflow = 'hidden';

      // afterEnter：transition 结束后复原。仅认自身 max-height 过渡
      // （子元素的 transitionend 会冒泡），且校验过渡代数（被中断则放弃）
      const finish = () => {
        el.style.maxHeight = '';
        el.style.overflow = el.dataset.oldOverflow ?? '';
        el.removeEventListener('transitionend', onEnd);
        clearTimeout(fallback);
      };
      const onEnd = (e: Event) => {
        if (e.target !== el || genRef.current !== gen) return;
        finish();
      };
      // 兜底：transition 不可用时也复原（约 220ms + 余量）
      const fallback = setTimeout(() => {
        if (genRef.current === gen) finish();
      }, 400);
      el.addEventListener('transitionend', onEnd);
    });
  }

  /** beforeLeave（collapse-transition.vue:68-77） */
  function beforeLeave(el: HTMLElement) {
    el.dataset.oldPaddingTop = el.style.paddingTop;
    el.dataset.oldMarginTop = el.style.marginTop;
    el.dataset.oldPaddingBottom = el.style.paddingBottom;
    el.dataset.oldMarginBottom = el.style.marginBottom;
    el.dataset.oldOverflow = el.style.overflow;
    el.style.maxHeight = `${el.scrollHeight}px`;
    el.style.overflow = 'hidden';
  }

  /** leave：rAF 后收起（collapse-transition.vue:79-89）——afterLeave 复原
   *  并置 display:none（v-show 语义，不卸载） */
  function leave(el: HTMLElement) {
    const gen = ++genRef.current;
    requestAnimationFrame(() => {
      if (el.scrollHeight !== 0) {
        el.style.maxHeight = '0';
        el.style.paddingTop = '0';
        el.style.paddingBottom = '0';
        el.style.marginTop = '0';
        el.style.marginBottom = '0';
      }

      // afterLeave（reset）+ display:none —— transition 结束后执行。
      // 仅认自身 max-height 过渡，且校验过渡代数（被中断则放弃）
      const finish = () => {
        el.style.maxHeight = '';
        el.style.overflow = el.dataset.oldOverflow ?? '';
        el.style.paddingTop = el.dataset.oldPaddingTop ?? '';
        el.style.paddingBottom = el.dataset.oldPaddingBottom ?? '';
        el.style.display = 'none';
        el.removeEventListener('transitionend', onEnd);
        clearTimeout(fallback);
      };
      const onEnd = (e: Event) => {
        if (e.target !== el || genRef.current !== gen) return;
        finish();
      };
      // 兜底：transition 不可用时也收起（约 220ms + 余量）
      const fallback = setTimeout(() => {
        if (genRef.current === gen) finish();
      }, 400);
      el.addEventListener('transitionend', onEnd);
    });
  }

  // 初次挂载：首帧前应用 display（等价 v-show 初值，无闪烁、无动画）
  const setRef = useCallback((el: HTMLElement | null) => {
    elRef.current = el;
    if (el && initialRef.current) {
      initialRef.current = false;
      el.style.display = showRef.current ? '' : 'none';
    }
  }, []);

  // v-show 切换：display + 过渡（初次渲染由 setRef 处理，effect 为 no-op）
  const prevShowRef = useRef(show);
  useEffect(() => {
    const el = elRef.current;
    const wasShown = prevShowRef.current;
    prevShowRef.current = show;
    if (!el || wasShown === show) return;
    if (show) {
      el.style.display = '';
      beforeEnter(el);
      enter(el);
    } else {
      beforeLeave(el);
      leave(el);
    }
  }, [show]);

  // 直接渲染 children 并附加 ref/过渡类 —— 无 wrapper（见文件头注释）
  return <ChildWithRef setRef={setRef}>{children}</ChildWithRef>;
}

/**
 * 单子元素 ref 转发 —— 将 setRef 注入唯一的子元素（要求 children 为
 * 单一宿主元素，等价 reference 的槽位直接过渡；使用场景即 <ul>）。
 * cloneElement 而非 wrapper div，保证 DOM 结构与 reference 一致。
 */
import { cloneElement, isValidElement } from 'react';
function ChildWithRef({
  children,
  setRef,
}: {
  children: React.ReactNode;
  setRef: (el: HTMLElement | null) => void;
}) {
  if (!isValidElement(children)) return <>{children}</>;
  const child = children as React.ReactElement<{ ref?: unknown }>;
  return cloneElement(child, {
    ref: (el: HTMLElement | null) => {
      setRef(el);
      // 保留子元素自带的 ref（若定义）
      const own = (child as unknown as { ref?: { current: unknown } }).ref;
      if (own && typeof own === 'object') own.current = el;
    },
  });
}

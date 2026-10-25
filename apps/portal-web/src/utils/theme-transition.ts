import { flushSync } from 'react-dom';
import { usePreferencesStore } from '../stores/preferences-store';

// View Transition API —— 尚未包含在当前 DOM lib 目标中（自 theme-button 迁入）
type ViewTransition = {
  ready: Promise<void>;
  skipTransition: () => void;
};
type DocumentWithViewTransition = Document & {
  startViewTransition?: (cb: () => void) => ViewTransition;
};

export type ThemeMode = 'light' | 'dark' | 'auto';

/** mode 解析为实际明暗（auto 跟随系统，等价 ThemeProvider 的 matchMedia 逻辑） */
function resolveIsDark(mode: ThemeMode): boolean {
  return (
    mode === 'dark' ||
    (mode === 'auto' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
}

/**
 * 主题模式切换统一入口（radial View Transition，上游放射动画）。
 * 三条路径共用——ThemeButton 点击、theme-toggle 悬停三选一、偏好抽屉 Theme 块，
 * 此前仅按钮路径有动画，其余硬切（"切换不流畅"的根因之一）。
 * - 回调内 flushSync 同步提交 store 更新（等价上游 await nextTick()），
 *   保证 startViewTransition 前后视图快照一致
 * - 不支持 View Transition / prefers-reduced-motion / Element.animate
 *   时降级为直接更新（硬切）
 * - event 提供放射圆心（缺省视口中心）
 */
export function switchThemeMode(
  mode: ThemeMode,
  event?: { clientX: number; clientY: number },
) {
  // 同值不重复切换（避免点击当前模式仍触发动画）
  if (usePreferencesStore.getState().theme.mode === mode) return;

  const update = () => {
    flushSync(() => {
      usePreferencesStore.getState().updatePreferences({ theme: { mode } });
    });
  };

  const doc = document as DocumentWithViewTransition;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof doc.startViewTransition !== 'function' || reduced) {
    update();
    return;
  }

  const x = event?.clientX ?? window.innerWidth / 2;
  const y = event?.clientY ?? window.innerHeight / 2;
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  const transition = doc.startViewTransition(update);
  transition.ready.then(() => {
    // jsdom / 旧浏览器无 Web Animations API —— 立即结束过渡，避免 unhandled rejection
    if (typeof document.documentElement.animate !== 'function') {
      transition.skipTransition();
      return;
    }
    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${endRadius}px at ${x}px ${y}px)`,
    ];

    const nextIsDark = resolveIsDark(mode);
    // 切到暗色：旧快照从全屏收缩为圆（reveal 新内容）；切到亮色：新快照从圆放大
    const animate = document.documentElement.animate(
      { clipPath: nextIsDark ? [...clipPath].reverse() : clipPath },
      {
        duration: 450,
        easing: 'ease-in',
        pseudoElement: nextIsDark
          ? '::view-transition-old(root)'
          : '::view-transition-new(root)',
      },
    );
    animate.onfinish = () => {
      transition.skipTransition();
    };
  });
}

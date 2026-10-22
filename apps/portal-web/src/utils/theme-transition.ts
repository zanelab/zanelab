import { flushSync } from 'react-dom';
import { usePreferencesStore } from '../stores/preferences-store';

type ViewTransition = {
  ready: Promise<void>;
  skipTransition: () => void;
};
type DocumentWithViewTransition = Document & {
  startViewTransition?: (cb: () => void) => ViewTransition;
};

export type ThemeMode = 'light' | 'dark' | 'auto';

function resolveIsDark(mode: ThemeMode): boolean {
  return (
    mode === 'dark' ||
    (mode === 'auto' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
}

export function switchThemeMode(
  mode: ThemeMode,
  event?: { clientX: number; clientY: number },
) {
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
    if (typeof document.documentElement.animate !== 'function') {
      transition.skipTransition();
      return;
    }
    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${endRadius}px at ${x}px ${y}px)`,
    ];

    const nextIsDark = resolveIsDark(mode);
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

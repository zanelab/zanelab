import { useEffect } from 'react';
import { usePreferencesStore } from '../../../stores/preferences-store';
import { generatorColorVariables } from '@zanelab/utils';

export function usePreferencesRuntime() {
  const radius = usePreferencesStore((s) => s.theme.radius);
  const fontSize = usePreferencesStore((s) => s.theme.fontSize);
  const colorPrimary = usePreferencesStore((s) => s.theme.colorPrimary);
  const colorDestructive = usePreferencesStore((s) => s.theme.colorDestructive);
  const colorSuccess = usePreferencesStore((s) => s.theme.colorSuccess);
  const colorWarning = usePreferencesStore((s) => s.theme.colorWarning);
  const colorWeakMode = usePreferencesStore((s) => s.app.colorWeakMode);
  const colorGrayMode = usePreferencesStore((s) => s.app.colorGrayMode);
  const updatePreferences = usePreferencesStore((s) => s.updatePreferences);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767.98px)');
    const handler = (e: MediaQueryList | MediaQueryListEvent) => {
      updatePreferences({ app: { isMobile: e.matches } });
    };
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [updatePreferences]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--radius', `${radius}rem`);
    root.style.setProperty('--radius-field', `${Number(radius) / 2}rem`);
    root.style.setProperty('--radius-selector', `${radius}rem`);
    root.style.setProperty('--radius-box', `${radius}rem`);
    root.style.setProperty('--font-size-base', `${fontSize}px`);
    root.style.setProperty('--menu-font-size', `calc(${fontSize}px * 0.875)`);
  }, [radius, fontSize]);

  useEffect(() => {
    const root = document.documentElement;
    if (!colorPrimary && !colorDestructive && !colorSuccess && !colorWarning) {
      return;
    }
    const colorVariables = generatorColorVariables([
      { color: colorPrimary, name: 'primary' },
      { alias: 'warning', color: colorWarning, name: 'yellow' },
      { alias: 'success', color: colorSuccess, name: 'green' },
      { alias: 'destructive', color: colorDestructive, name: 'red' },
    ]);

    const colorMappings: Record<string, string> = {
      '--green-500': '--success',
      '--primary-500': '--primary',
      '--red-500': '--destructive',
      '--yellow-500': '--warning',
    };
    for (const [sourceVar, targetVar] of Object.entries(colorMappings)) {
      const colorValue = colorVariables[sourceVar];
      if (colorValue) {
        root.style.setProperty(targetVar, colorValue);
      }
    }

    for (const [key, value] of Object.entries(colorVariables)) {
      if (!(key in colorMappings)) {
        root.style.setProperty(key, value);
      }
    }
  }, [colorPrimary, colorDestructive, colorSuccess, colorWarning]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('invert-mode', colorWeakMode);
    root.classList.toggle('grayscale-mode', colorGrayMode);
  }, [colorWeakMode, colorGrayMode]);
}

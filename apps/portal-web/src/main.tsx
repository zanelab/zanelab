import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { appConfig } from './config';
import { ThemeProvider } from './components/theme-provider';
import { ToastRegion } from '@zanelab/ui';
import { App } from './App';
import { applyConfigPreferences } from './stores/preferences-store';
import { initIcons } from './stores/icon-store';
import { setupHostState } from './micro/register';

import './locales/i18n';
import './index.css';
import './components/menu/menu.css';
import '@zanelab/ui/scrollbar.css';

const rootEl = document.getElementById('root')!;

function renderApp() {
  createRoot(rootEl).render(
    <StrictMode>
      <ThemeProvider>
        <BrowserRouter useTransitions={false}>
          <App />
          <ToastRegion />
        </BrowserRouter>
      </ThemeProvider>
    </StrictMode>,
  );
}

async function bootstrap() {
  const cfgPrefs = appConfig.preferences;
  const cfgApp = (cfgPrefs.app ?? {}) as Record<string, unknown>;
  const cfgTheme = (cfgPrefs.theme ?? {}) as Record<string, unknown>;
  const cfgHeader = (cfgPrefs.header ?? {}) as Record<string, unknown>;
  const cfgBreadcrumb = (cfgPrefs.breadcrumb ?? {}) as Record<string, unknown>;
  applyConfigPreferences({
    ...cfgPrefs,
    app: {
      layout: appConfig.layout.layout,
      authPageLayout: appConfig.layout.authPageLayout,
      ...cfgApp,
    },
    theme: { mode: appConfig.layout.theme, ...cfgTheme },

    header: {
      mode: appConfig.layout.fixedHeader ? 'fixed' : 'static',
      ...cfgHeader,
    },
    breadcrumb: { enable: appConfig.layout.showBreadcrumb, ...cfgBreadcrumb },
  });
  document.documentElement.dataset.theme =
    (cfgTheme.mode as string | undefined) ?? appConfig.layout.theme;

  void initIcons();

  if (import.meta.env.DEV && appConfig.api.useMock) {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }

  setupHostState();

  renderApp();
}

void bootstrap();

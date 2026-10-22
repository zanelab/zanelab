import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { Suspense } from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import LoginPage from './index';
import { App } from '@/App';
import { appConfig } from '@/config';
import { useAuthStore, initialAuthState } from '@/stores/auth-store';
import { useMenuStore, initialMenuState } from '@/stores/menu-store';
import { findFirstNavigablePath } from '@/utils/menu-views';
import { mockMenus } from '@/mocks/handlers';

vi.mock('qrcode', () => ({
  toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mock'),
}));

vi.mock('qiankun', () => ({
  registerMicroApps: vi.fn(),
  start: vi.fn(),
}));

vi.mock('@/api/auth', () => ({
  authApi: {
    login: vi.fn().mockResolvedValue({
      token: 'race-access-token',
      refreshToken: 'race-refresh-token',
      user: { id: 1, username: 'admin', nickname: '管理员' },
    }),
  },
}));

vi.mock('@/api/menu', async () => {
  const { mockMenus } = await import('@/mocks/handlers');
  return { fetchMenus: vi.fn().mockResolvedValue(mockMenus) };
});

afterEach(() => {
  cleanup();
  localStorage.clear();

  useAuthStore.setState(initialAuthState);
  useMenuStore.setState(initialMenuState);
  appConfig.microApps = {};
});

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/auth/login']}>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage（C2）', () => {
  it('渲染 AuthPageLayout 壳：系统名、品牌、登录表单', async () => {
    renderLogin();
    await waitFor(() => {
      expect(screen.getAllByText('统一管理平台').length).toBeGreaterThanOrEqual(
        1,
      );
    });

    expect(
      screen.getByPlaceholderText(/用户名|账号/i) ?? screen.getByRole('button'),
    ).toBeTruthy();
  });
});

describe('登录跨树导航竞态（09-09 子应用 died 复现）', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
  });

  it('登录成功 → 跨 auth/layout 树导航同步提交：微任务排空（qiankun mount 时机）#subapp-container 已在 DOM', async () => {
    appConfig.microApps = {
      iam: {
        name: 'iam',
        entry: '//localhost:7100/iam/',
        container: 'subapp-container',
        activeRule: '/system',
        props: {},
        prefetch: false,
      },
    };

    await import('@/api/auth');

    const { container } = render(
      <Suspense fallback={null}>
        <MemoryRouter
          useTransitions={false}
          initialEntries={['/login?from=/system']}
        >
          <App />
        </MemoryRouter>
      </Suspense>,
    );

    await waitFor(() => {
      expect(container.querySelector('form')).toBeTruthy();
    });

    fireEvent.change(container.querySelector('input[type="text"]')!, {
      target: { value: 'admin' },
    });
    fireEvent.change(container.querySelector('input[type="password"]')!, {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'login' }));

    for (let i = 0; i < 20; i += 1) {
      await Promise.resolve();
    }

    expect(document.getElementById('subapp-container')).not.toBeNull();

    expect(useAuthStore.getState().token).toBe('race-access-token');
  });
});

describe('已登录访问认证页（09-28）', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
  });

  afterEach(() => {
    delete (document as unknown as { referrer?: string }).referrer;
  });

  function PathProbe() {
    const location = useLocation();
    return (
      <div data-testid="path">
        {location.pathname}
        {location.search}
      </div>
    );
  }

  function PushToAuthLogin() {
    const navigate = useNavigate();
    return (
      <button
        type="button"
        data-testid="push-login"
        onClick={() => navigate('/auth/login')}
      >
        push
      </button>
    );
  }

  function renderApp(initialEntries: string[]) {
    return render(
      <Suspense fallback={null}>
        <MemoryRouter useTransitions={false} initialEntries={initialEntries}>
          <PathProbe />
          <App />
        </MemoryRouter>
      </Suspense>,
    );
  }

  it('手输 /login（POP）且 token 有效 → 送回应用，不停登录页', async () => {
    useAuthStore.setState({ token: 'valid-token', isInitialized: true });
    useMenuStore.getState().setMenus(mockMenus);

    const target =
      findFirstNavigablePath(mockMenus) || appConfig.route.homePath;

    renderApp(['/login']);

    await waitFor(() => {
      expect(screen.getByTestId('path')).toHaveTextContent(target);
    });
  });

  it('已登录访问 /lock（锁屏）→ 不重定向', async () => {
    useAuthStore.setState({ token: 'valid-token', isInitialized: true });
    renderApp(['/lock']);

    await waitFor(() => {
      expect(screen.getByTestId('path')).toHaveTextContent('/lock');
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByTestId('path')).toHaveTextContent('/lock');
  });

  it('应用内跳转到 /auth/login（锁屏「返回登录」）→ 仍显示登录页', async () => {
    useAuthStore.setState({ token: 'valid-token', isInitialized: true });
    const { container } = render(
      <Suspense fallback={null}>
        <MemoryRouter useTransitions={false} initialEntries={['/dashboard']}>
          <PathProbe />
          <App />
          <PushToAuthLogin />
        </MemoryRouter>
      </Suspense>,
    );

    fireEvent.click(screen.getByTestId('push-login'));

    await waitFor(() => {
      expect(container.querySelector('form')).toBeTruthy();
    });
    expect(screen.getByTestId('path')).toHaveTextContent('/auth/login');
  });

  it('子应用 401 兜底的整页跳转（referrer 为应用页）→ 保持登录页，不送回应用', async () => {
    useAuthStore.setState({ token: 'valid-token', isInitialized: true });
    useMenuStore.getState().setMenus(mockMenus);

    Object.defineProperty(document, 'referrer', {
      configurable: true,
      get: () => `${window.location.origin}/system/agents`,
    });

    const { container } = renderApp(['/login']);

    await waitFor(() => {
      expect(container.querySelector('form')).toBeTruthy();
    });
    expect(screen.getByTestId('path')).toHaveTextContent('/login');
  });
});

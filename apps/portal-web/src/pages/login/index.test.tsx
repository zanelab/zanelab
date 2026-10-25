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

// 登录跨树导航竞态（09-09 子应用 died）需要 mock qiankun（真实 start 的
// prefetch 会请求子应用 entry，MSW onUnhandledRequest:'error' 直接报错）
vi.mock('qiankun', () => ({
  registerMicroApps: vi.fn(),
  start: vi.fn(),
}));

// api 模块 mock 为「微任务即完成」——集成断言只排微任务（qiankun remount 的
// 执行窗口），真实 fetch 的宏任务会给 scheduler 提前提交的机会，测试失真。
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

// C2 验收冒烟：登录页在 AuthPageLayout 壳内完整渲染（表单/验证码/二维码/注册/找回切换入口可用）。
afterEach(() => {
  cleanup();
  localStorage.clear();

  // zustand 模块级单例：测试间 setState 复位（部分合并，保留 action）
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
      // 配置 system.name（DEFAULT_CONFIG.system.name）
      expect(screen.getAllByText('统一管理平台').length).toBeGreaterThanOrEqual(
        1,
      );
    });

    // 登录表单元素
    expect(
      screen.getByPlaceholderText(/用户名|账号/i) ?? screen.getByRole('button'),
    ).toBeTruthy();
  });
});

describe('登录跨树导航竞态（09-09 子应用 died 复现）', () => {
  beforeAll(() => {
    // App 装配链（use-preferences-runtime 的 isMobile 断点）依赖 matchMedia
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
    // 镜像线上配置：activeRule /system、容器 #subapp-container
    appConfig.microApps = {
      iam: {
        name: 'iam',
        entry: '//localhost:7100/iam/',
        container: 'subapp-container',
        activeRule: '/system',
        props: {},
        prefetch: false,
        public: false,
      },
    };

    // 预热 handler 内的动态 import（走模块缓存 → 微任务即完成；首次加载的
    // 宏任务会让 scheduler 提前 flush，测试失真）
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
    // 等懒加载登录页就绪（此阶段的宏任务无害——尚未提交导航）
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

    // 只排微任务：等价 single-spa 已加载子应用 remount → qiankun mount →
    // querySelector('#subapp-container') 的执行窗口（不进宏任务）
    for (let i = 0; i < 20; i += 1) {
      await Promise.resolve();
    }

    expect(document.getElementById('subapp-container')).not.toBeNull();

    // 登录链路本身完整：token 入库（props getter 挂载时读到的即此值）
    expect(useAuthStore.getState().token).toBe('race-access-token');
  });
});

/**
 * 09-28：已登录（token 未过期）时不该再停在登录页。
 *
 * 场景：手输 /login、刷新、书签、前进后退（navigationType='POP'）→ 直接送回应用。
 * 反向约束：应用内跳转（锁屏「返回登录」/lock → /auth/login 是 PUSH）必须仍能
 * 看到登录页，否则锁屏就没有切换账号的入口（见 App.tsx 守卫注释）。
 */
describe('已登录访问认证页（09-28）', () => {
  beforeAll(() => {
    // 同上：App 装配链（use-preferences-runtime 的 isMobile 断点）依赖 matchMedia
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
    // referrer 是 stub 到 document 上的自有属性，用完删掉即可回落到原型实现（空串）
    delete (document as unknown as { referrer?: string }).referrer;
  });

  /** 落点探针：放 Routes 外层，重定向时也能观测最终 URL */
  function PathProbe() {
    const location = useLocation();
    return (
      <div data-testid="path">
        {location.pathname}
        {location.search}
      </div>
    );
  }

  /** 模拟应用内跳转（PUSH），等价锁屏「返回登录」的 navigate('/auth/login') */
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
    useAuthStore.getState().setAuth({ token: 'valid-token' });
    useMenuStore.getState().setMenus(mockMenus);

    // 落点与登录成功后一致：菜单树第一个可导航路径，兜底 homePath
    const target =
      findFirstNavigablePath(mockMenus) || appConfig.route.homePath;

    renderApp(['/login']);

    await waitFor(() => {
      expect(screen.getByTestId('path')).toHaveTextContent(target);
    });
  });

  it('已登录访问 /lock（锁屏）→ 不重定向', async () => {
    useAuthStore.getState().setAuth({ token: 'valid-token' });
    renderApp(['/lock']);

    await waitFor(() => {
      expect(screen.getByTestId('path')).toHaveTextContent('/lock');
    });

    // 再排空一轮任务：确认懒加载完成后也未被重定向
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByTestId('path')).toHaveTextContent('/lock');
  });

  it('应用内跳转到 /auth/login（锁屏「返回登录」）→ 仍显示登录页', async () => {
    useAuthStore.getState().setAuth({ token: 'valid-token' });
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
    useAuthStore.getState().setAuth({ token: 'valid-token' });
    useMenuStore.getState().setMenus(mockMenus);

    // 等价 window.location.href = '/login'：整页加载（POP）+ referrer 是刚离开的应用页
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

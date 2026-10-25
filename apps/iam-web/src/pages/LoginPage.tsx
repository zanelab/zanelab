import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getProps } from '../main';

interface LoginResponse {
  code?: number | string;
  msg?: string;
  message?: string;
  data?: {
    token: string;
    refreshToken?: string;
    userId?: number | string;
    name?: string;
  };
}

// iam 自定义登录页（public 路由，未登录可访问）。
// 复用宿主 props.http 共享 axios 实例（baseURL/拦截器一致），
// 登录成功经 props.onLoginSuccess 把会话交还宿主（bootstrapSession + 跳转）。
export function LoginPage() {
  const props = getProps();
  const location = useLocation();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!username.trim() || !password) {
      setError('请输入用户名和密码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // 与宿主 encryptPassword 保持一致（base64）
      const body = {
        username: username.trim(),
        password: btoa(password.trim()),
      };
      const res = (await props.http?.post('/sys/auth/login', body)) as
        LoginResponse | { data?: LoginResponse } | undefined;
      const data = ((res as { data?: LoginResponse })?.data ??
        (res as LoginResponse)) as LoginResponse;
      if (data?.data?.token) {
        await props.onLoginSuccess?.({
          token: data.data.token,
          refreshToken: data.data.refreshToken,
          user: {
            id: data.data.userId,
            username: data.data.name,
            nickname: data.data.name,
          },
        });
        // onLoginSuccess 内部 pushState 交还路由控制权，无需子应用再跳转
        return;
      }
      setError(data?.msg || data?.message || '登录失败');
    } catch (e) {
      setError(e instanceof Error ? e.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-base-200 flex min-h-screen items-center justify-center">
      <div className="card bg-base-100 w-96 shadow-xl">
        <div className="card-body gap-4">
          <h1 className="card-title justify-center text-xl">登录</h1>
          <div className="form-control">
            <label className="label" htmlFor="login-username">
              <span className="label-text">用户名</span>
            </label>
            <input
              id="login-username"
              className="input input-bordered w-full"
              value={username}
              autoComplete="username"
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="form-control">
            <label className="label" htmlFor="login-password">
              <span className="label-text">密码</span>
            </label>
            <input
              id="login-password"
              type="password"
              className="input input-bordered w-full"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submit();
              }}
            />
          </div>
          {error && <div className="text-error text-sm">{error}</div>}
          <button
            className="btn btn-primary"
            disabled={loading}
            onClick={() => void submit()}
          >
            {loading && <span className="loading loading-spinner" />}
            登录
          </button>
          <div className="text-center text-xs opacity-50">
            {location.pathname}
          </div>
        </div>
      </div>
    </div>
  );
}

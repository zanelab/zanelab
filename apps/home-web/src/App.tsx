import { useLocation } from 'react-router-dom';

// home 首页：无鉴权依赖，保持轻量（不引重依赖，见任务 PRD Notes）。
export function App() {
  const location = useLocation();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-3xl font-bold">首页</h1>
      <p className="text-sm opacity-60">欢迎回来</p>
      <div className="text-xs opacity-40">{location.pathname}</div>
    </div>
  );
}

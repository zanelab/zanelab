import { Route, Routes } from 'react-router-dom';
import { MarketplacePage } from './pages/marketplace/marketplace';
import { AgentPage } from './pages/agent/agent-page';

// skills 首页 = Agent Skills 市场；另有 agent 目录页 /agent；
// 未知路径回落市场页。
// **路由顺序**：`agent` 必须排在 `*` 之前，否则被兜底路由吞掉。
export function App() {
  return (
    <Routes>
      <Route index element={<MarketplacePage />} />
      <Route path="agent" element={<AgentPage />} />
      <Route path="*" element={<MarketplacePage />} />
    </Routes>
  );
}

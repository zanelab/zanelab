import { Route, Routes } from 'react-router-dom';
import { MarketplacePage } from './pages/marketplace/marketplace';

// skills 首页 = Agent Skills 市场；暂无其它页面，未知路径回落市场页。
export function App() {
  return (
    <Routes>
      <Route index element={<MarketplacePage />} />
      <Route path="*" element={<MarketplacePage />} />
    </Routes>
  );
}

import { useNavigate } from 'react-router-dom';
import { useLayoutStore } from '@/stores/layout-store';
import { LockScreen } from '@/components/layouts/widgets/lock-screen/lock-screen';
import { syncNavigate } from '@zanelab/utils';

/**
 * 锁屏页 —— 解锁密码取 layout store 的 lockScreenPassword（等价
 * reference LockScreen 校验 accessStore.lockScreenPassword）；未设置时
 * 回退演示默认 'admin'（直接访问 /lock 未经过锁屏弹窗的场景）。
 */
export default function LockPage() {
  const navigate = useNavigate();
  const lockScreenPassword = useLayoutStore((s) => s.lockScreenPassword);

  return (
    <LockScreen
      avatar=""
      password={lockScreenPassword || 'admin'}
      // 解锁回 layout 是 auth↔layout 跨树导航：须 syncNavigate 同步提交，
      // 否则 qiankun remount 在容器渲染前执行 → 子应用 died（09-09）
      onUnlock={() => syncNavigate(navigate, '/')}
      onToLogin={() => navigate('/auth/login')}
    />
  );
}

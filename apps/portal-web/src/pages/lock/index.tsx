import { useNavigate } from 'react-router-dom';
import { useLayoutStore } from '@/stores/layout-store';
import { LockScreen } from '@/components/layouts/widgets/lock-screen/lock-screen';
import { syncNavigate } from '@zanelab/utils';

export default function LockPage() {
  const navigate = useNavigate();
  const lockScreenPassword = useLayoutStore((s) => s.lockScreenPassword);

  return (
    <LockScreen
      avatar=""
      password={lockScreenPassword || 'admin'}

      onUnlock={() => syncNavigate(navigate, '/')}
      onToLogin={() => navigate('/auth/login')}
    />
  );
}

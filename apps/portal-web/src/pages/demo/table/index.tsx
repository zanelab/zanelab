import { useTranslation } from 'react-i18next';

export default function TableDemoPage() {
  const { t } = useTranslation();
  const rows = [
    { id: 1, name: 'admin', nickname: '管理员', status: '启用' },
    { id: 2, name: 'zhang', nickname: '张三', status: '启用' },
    { id: 3, name: 'li', nickname: '李四', status: '禁用' },
  ];
  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold">{t('demo.table.title')}</h2>
      <div className="card bg-base-100 mt-4 shadow">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{t('demo.table.username')}</th>
                  <th>{t('demo.table.nickname')}</th>
                  <th>{t('demo.table.status')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.name}</td>
                    <td>{row.nickname}</td>
                    <td>
                      <span
                        className={`badge ${row.status === '启用' ? 'badge-success' : 'badge-ghost'}`}
                      >
                        {row.status === '启用'
                          ? t('demo.table.enabled')
                          : t('demo.table.disabled')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

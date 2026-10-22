import { describe, expect, it, vi } from 'vitest';

window.__APP_CONFIG__ = {
  microApps: {
    'npa-plt-system': {
      name: 'npa-plt-system',
      entry: '//localhost:5172',
      container: '#subapp-container',
      activeRule: '/npa-plt-system',
      props: {},
    },
  },
};

vi.mock('../utils/http', () => ({
  default: { get: vi.fn() },
}));

const { default: http } = await import('../utils/http');
const { fetchMenus } = await import('./menu');

const rawMenus = [
  {
    id: 285,
    code: '534',
    name: 'AgentFlow',
    component: 'agent_flow',
    uri: 'agent_flow',
    type: 'app',
    children: [
      {
        id: 478,
        name: '工作台',
        component: '/app/list',
        uri: '/app/list',
        type: 'menu',
        children: null,
      },
    ],
  },
  {
    id: 284,
    code: '87',
    name: 'MAIP',
    component: 'maip',
    uri: '',
    type: 'app',
    children: [
      {
        id: 269,
        name: '基础模型',
        component: './ModelManage/index',
        uri: '/model_manage/basic',
        type: 'menu',
        children: null,
      },
      {
        id: 296,
        name: '服务中心',
        component: '/maasHub',
        uri: '/maasHub',
        type: 'menu',
        children: [
          {
            id: 297,
            name: '渠道管理',
            component: '/channelManage',
            uri: '/channelManage',
            type: 'menu',
            children: null,
          },
        ],
      },
    ],
  },
  {
    id: 598,
    code: '121677',
    name: 'MAIP Studio',
    component: 'aiasset',
    uri: null,
    type: 'app',
    children: [
      {
        id: 604,
        name: '模型服务',
        component: 'ModelsDeploy',
        uri: '/maip/models_deploy',
        type: 'menu',
        children: [
          {
            id: 289,
            name: '批量任务',
            component: './OfflineTask/index',
            uri: '/maip/offline_task',
            type: 'menu',
            children: null,
          },
        ],
      },
    ],
  },
  {
    id: 321,
    code: '1635',
    name: 'ABP',
    component: 'app_builder',
    uri: null,
    type: 'app',
    children: [
      {
        id: 457,
        name: '应用资产中心',
        component: 'applicationTemplate',
        uri: '/app_builder/applicationTemplate',
        type: 'menu',
        children: [
          {
            id: 458,
            name: '模板广场',
            component: 'applicationTemplate',
            uri: '/applicationTemplate/templateSquare',
            type: 'menu',
            children: null,
          },
        ],
      },
    ],
  },
  {
    id: 266,
    code: '1',
    name: '基础管理',
    component: 'platform_manager',
    uri: '',
    type: 'app',
    children: [
      {
        id: 333,
        name: '解决方案',
        component: '/agent_flow/solution/endB',
        uri: '/agent_flow/solution/endB',
        type: 'menu',
        children: null,
      },
      {
        id: 404,
        name: '用户管理',
        component: '/npa-plt-system/admin/user',
        uri: '/npa-plt-system/admin/user',
        type: 'menu',
        children: null,
      },
      {
        id: 328,
        name: '数据统计',
        component: 'data_statistics',
        uri: '/data_statistics',
        type: 'menu',
        children: [
          {
            id: 329,
            name: '调度数据统计',
            component: 'workflowStatistics',
            uri: '/workflow/statistics',
            type: 'menu',
            children: null,
          },
        ],
      },
    ],
  },
];

function pathsOf(menus: { path: string; children?: unknown }[]): string[] {
  return menus.flatMap((m) => [
    m.path,
    ...pathsOf(
      (m.children as { path: string; children?: unknown }[] | undefined) || [],
    ),
  ]);
}

describe('fetchMenus 前缀拼接', () => {
  it('子菜单 uri 为应用内相对路径 → 拼 /{component} 前缀（MAIP 补上 maip）', async () => {
    vi.mocked(http.get).mockResolvedValue(rawMenus);
    const menus = await fetchMenus();

    const maip = menus.find((m) => m.name === 'MAIP');
    expect(maip?.path).toBe('/maip');
    expect(pathsOf((maip?.children || []) as never)).toEqual([
      '/maip/model_manage/basic',
      '/maip/maasHub',
      '/maip/channelManage',
    ]);

    const agentFlow = menus.find((m) => m.name === 'AgentFlow');
    expect(pathsOf((agentFlow?.children || []) as never)).toEqual([
      '/agent_flow/app/list',
    ]);

    const abp = menus.find((m) => m.name === 'ABP');
    expect(pathsOf((abp?.children || []) as never)).toEqual([
      '/app_builder/applicationTemplate',
      '/app_builder/applicationTemplate/templateSquare',
    ]);
  });

  it('子菜单 uri 指向其它子应用（分组应用）→ 不拼前缀（基础管理 / MAIP Studio）', async () => {
    vi.mocked(http.get).mockResolvedValue(rawMenus);
    const menus = await fetchMenus();

    const platform = menus.find((m) => m.name === '基础管理');
    expect(pathsOf((platform?.children || []) as never)).toEqual([
      '/agent_flow/solution/endB',
      '/npa-plt-system/admin/user',
      '/data_statistics',
      '/workflow/statistics',
    ]);

    const studio = menus.find((m) => m.name === 'MAIP Studio');
    expect(pathsOf((studio?.children || []) as never)).toEqual([
      '/maip/models_deploy',
      '/maip/offline_task',
    ]);
  });
});

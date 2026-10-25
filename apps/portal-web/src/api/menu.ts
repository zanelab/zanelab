import http from '../utils/http';
import { appConfig } from '../config';
import type { MenuItem } from '../types';

// ── 旧后端菜单原始字段类型（/user/menu/tree 返回结构） ──

interface RawMenuItem {
  id: number;
  pid: number;
  code: string;
  parent: string;
  name: string;
  component: string;
  uri: string | null;
  type: 'app' | 'menu' | 'button' | 'group';
  sort: number;
  icon: string | null;
  hidden: boolean;
  scopes: string[];
  menuType: number; // 0=目录 1=菜单 2=按钮
  children?: RawMenuItem[] | null;
}

/**
 * 已知应用路由基（URL 第一段）：全部 app 节点的 component（agent_flow/maip/
 * aiasset/app_builder/platform_manager …）+ 已注册子应用（config.microApps 的键与
 * activeRule，如 npa-plt-system）。用于判定菜单 uri 是否已是绝对路径。
 */
function collectAppBases(rawMenus: RawMenuItem[]): Set<string> {
  const bases = new Set<string>();
  const add = (value?: string | null) => {
    const base = (value || '').replace(/^\/+/, '').split('/')[0];
    if (base) bases.add(base);
  };
  for (const raw of rawMenus) {
    if (raw.type === 'app') add(raw.uri || raw.component);
  }
  for (const [name, cfg] of Object.entries(appConfig.microApps)) {
    add(name);
    add(cfg.activeRule);
  }
  return bases;
}

/** uri 的第一段路径（'/app_builder/x' → 'app_builder'；空 uri → ''）。 */
function firstSegment(uri: string | null | undefined): string {
  if (!uri) return '';
  return uri.replace(/^\/+/, '').split('/')[0];
}

/** uri 是否已是「/已知应用/…」绝对路径（第一段落命中已知应用路由基）。 */
function isAbsoluteUri(
  uri: string | null | undefined,
  appBases: Set<string>,
): boolean {
  if (!uri || !uri.startsWith('/')) return false;
  return appBases.has(firstSegment(uri));
}

/**
 * 虚拟分组应用判定：app 节点自身无 uri（不是子应用入口），且存在直接子菜单的 uri
 * 指向**其它**已知应用 —— 说明它只是菜单分组容器，子菜单各自指向真实子应用
 * （如 基础管理 下的 /npa-plt-system/admin/user、/agent_flow/solution/endB、
 * /maip/config_map；MAIP Studio 下的 /maip/models_deploy），此时整棵子树都不拼前缀。
 *
 * 反向例子（不能整棵子树免前缀，否则丢失子应用段）：
 * - MAIP：component='maip' uri=''，子菜单 uri 是 /model_manage/basic 这类应用内
 *   相对路径 → 拼 /maip。
 * - ABP：component='app_builder'，一级菜单 uri 恰好自带自身前缀
 *   （/app_builder/applicationTemplate），但二级 uri（/applicationTemplate/
 *   templateSquare）是应用内相对路径 → 仍需拼 /app_builder。
 */
function isVirtualGroupApp(raw: RawMenuItem, appBases: Set<string>): boolean {
  if (raw.type !== 'app' || raw.uri) return false;
  const ownBase = firstSegment(raw.component);
  return (raw.children || []).some((child) => {
    const segment = firstSegment(child.uri);
    return segment !== '' && segment !== ownBase && appBases.has(segment);
  });
}

/**
 * 递归转换旧后端菜单树 → 项目 MenuItem 格式。
 *
 * 映射规则（参考旧项目 formatMenus + formatRoute）：
 * - type='app' 顶层节点：component 值是子应用名（agent_flow/maip/platform_manager 等），
 *   映射为 appName；path 用 /{component}。children 的 path 以此为前缀拼接。
 * - type='menu'：uri → path（拼前缀），有 component 且是本地组件路径 → 设 component。
 * - type='button'：uri → permission（权限码），不生成 path（不渲染菜单/路由，
 *   但保留在 children 中供 flattenPermissions 提取）。
 * - type='group'：目录节点，递归 children。
 *
 * noPrefix=true（虚拟分组应用的子树，见 isVirtualGroupApp）：children 的 uri 是
 * 跨子应用绝对路径，直接用 uri 作 path，不再拼 app 前缀。
 */
function transformMenu(
  raw: RawMenuItem,
  appPrefix: string,
  appBases: Set<string>,
  noPrefix = false,
): MenuItem | null {
  // button 类型 → 只取权限码，不生成菜单/路由
  if (raw.type === 'button') {
    return {
      id: raw.id,
      name: raw.name,
      path: '', // 无 path → toShellMenus/buildMenuRoutes 自然跳过
      permission: raw.uri || raw.code || undefined,
    };
  }

  const uri = raw.uri || '';
  let path: string;
  let appName: string | undefined;

  if (raw.type === 'app') {
    // 顶层 app 节点：component 是子应用名，path 用 /{component}
    const appNameVal = raw.component || raw.uri || raw.name;
    appName = appNameVal;
    path = `/${appNameVal}`;
  } else {
    // menu/group 节点：uri 拼到 app 前缀下
    const normalized = uri.startsWith('/') ? uri : `/${uri}`;

    // 以下三种情况 uri 已是绝对路径，不再拼前缀：
    // - 虚拟分组应用子树（noPrefix）
    // - 已带其它已知应用前缀（如 aiasset 下的 /maip/models_deploy）
    // - 已含自身应用前缀（如 app_builder 下的 /app_builder/applicationTemplate）
    const duplicated =
      appPrefix !== '' && normalized.startsWith(`${appPrefix}/`);
    path =
      noPrefix || isAbsoluteUri(uri, appBases) || duplicated
        ? normalized
        : `${appPrefix}${normalized}`;
    appName = appPrefix.slice(1) || undefined;
  }

  const item: MenuItem = {
    id: raw.id,
    name: raw.name,
    path,
    icon: raw.icon || undefined,
    appName,

    // 保留后端节点类型：默认落点计算需区分「应用根」与「菜单/目录」（见 menu-views）
    type: raw.type,
  };

  // 本地页 component：后端 component 可能是路径（如 './ModelManage/index'）或权限标识
  // 仅当不以 / 开头且非纯大写时视为本地组件路径
  if (
    raw.type === 'menu' &&
    raw.component &&
    !raw.component.startsWith('/') &&
    !/^[A-Z_]+$/.test(raw.component)
  ) {
    item.component = raw.component;
  }

  // 递归 children：app 节点的 children 用自身 path 作为新前缀
  if (raw.children?.length) {
    const childPrefix = raw.type === 'app' ? path : appPrefix;
    item.children = raw.children
      .map((child) => transformMenu(child, childPrefix, appBases, noPrefix))
      .filter((c): c is MenuItem => c !== null);
    if (item.children.length === 0) {
      delete item.children;
    }
  }

  return item;
}

/**
 * 拉取菜单树并转换为项目 MenuItem 格式。
 *
 * 旧后端 /user/menu/tree 返回 { code: "10000", data: RawMenuItem[] }，
 * 拦截器已解包 data。此处递归转换字段名和结构。
 *
 * 虚拟分组应用（见 isVirtualGroupApp，如基础管理 component='platform_manager' uri=''，
 * 子菜单 uri 已是 /npa-plt-system/admin/role、/agent_flow/solution/endB、/maip/config_map
 * 这类跨子应用绝对路径）：子菜单直接用 uri 作 path（noPrefix），并清 app 节点
 * appName 使 elementFor 返回 null → buildRoutes 扁平化 children
 * （避免 React Router 嵌套路由拼接父路径）。
 * children 的 appName 不变（仍为 component），elementFor 正确识别子应用路由。
 * 真实子应用（有 uri 的 AgentFlow，或子菜单 uri 是应用内相对路径的 MAIP）不受影响，
 * 拼 /{component} 前缀（/agent_flow/app/list、/maip/model_manage/basic）。
 */
export async function fetchMenus(): Promise<MenuItem[]> {
  const rawMenus = (await http.get(
    appConfig.api.menusEndpoint,
  )) as unknown as RawMenuItem[];
  if (!Array.isArray(rawMenus)) return [];

  // 先扫一遍全树收集应用路由基，供「uri 是否绝对路径」判定
  const appBases = collectAppBases(rawMenus);

  return rawMenus
    .map((raw) => {
      const virtualGroup = isVirtualGroupApp(raw, appBases);
      const item = transformMenu(raw, '', appBases, virtualGroup);
      if (!item) return null;

      // 虚拟分组应用：清 appName → elementFor 返回 null → buildRoutes 扁平化 children
      if (virtualGroup) {
        item.appName = undefined;
      }

      return item;
    })
    .filter((m): m is MenuItem => m !== null);
}

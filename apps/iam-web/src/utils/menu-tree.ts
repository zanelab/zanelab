/*
 * 菜单树操作纯函数 —— 菜单管理页的数据变换层。
 *
 * 全部无副作用、无 DOM 依赖，可独立单测（utils/menu-tree.test.ts）。
 * 树形约定：children 嵌套（MenuItemRecord 形状），兄弟按 sort 升序稳定排序
 * （同 sort 保持输入次序——服务端已 order by sort，这里只兜反序列化后的次序）。
 */
import type { MenuItemRecord } from '../api/menus';

/** 平铺行 → children 嵌套树（pid 关联；孤儿节点——pid 指向不存在的行——按根处理）。
 *  输入行允许携带服务端返回的原始 children 字段（嵌套形状直接平铺的场景），此处
 *  显式剥除后按 pid 重建——否则旧 children 与新收集的 children 混合会重复节点。 */
type TreeNode = Omit<MenuItemRecord, 'children'> & {
  children?: MenuItemRecord[] | null;
};

export function buildTree(flat: MenuItemRecord[]): MenuItemRecord[] {
  const byId = new Map<number, TreeNode>();
  const roots: TreeNode[] = [];

  for (const row of flat) {
    const { children: _ignored, ...rest } = row;
    byId.set(row.id, rest);
  }
  for (const node of byId.values()) {
    const parent = node.pid != null ? byId.get(node.pid) : undefined;
    if (parent) {
      (parent.children ??= []).push(node);
    } else {
      roots.push(node);
    }
  }

  // 兄弟排序 + 空数组收敛为 undefined（与旧契约 children 可空一致）
  const finalize = (nodes: TreeNode[]): MenuItemRecord[] =>
    nodes
      .sort((a, b) => a.sort - b.sort)
      .map(({ children, ...rest }) => ({
        ...rest,
        children: children?.length ? finalize(children) : undefined,
      }));
  return finalize(roots);
}

/** 树 → 平铺行（先根遍历；管理页提交整树前的展开场景使用）。 */
export function flatten(tree: MenuItemRecord[]): MenuItemRecord[] {
  const out: MenuItemRecord[] = [];
  const walk = (nodes: MenuItemRecord[] | null | undefined) => {
    for (const node of nodes ?? []) {
      const { children, ...rest } = node;
      out.push(rest);
      walk(children);
    }
  };
  walk(tree);
  return out;
}

/** 节点及其全部后代数量（删除确认弹窗的级联警告文案用）。 */
export function countWithDescendants(
  flat: MenuItemRecord[],
  id: number,
): number {
  const childIds = new Map<number, number[]>();
  for (const row of flat) {
    if (row.pid != null) {
      (childIds.get(row.pid) ?? childIds.set(row.pid, []).get(row.pid)!).push(
        row.id,
      );
    }
  }
  let count = 0;
  const stack = [id];
  while (stack.length) {
    const current = stack.pop()!;
    count += 1;
    stack.push(...(childIds.get(current) ?? []));
  }
  return count;
}

/** 平铺行的直接子节点（新增/编辑表单选父级时的候选列表）。 */
export function childrenOf(
  flat: MenuItemRecord[],
  pid: number | null,
): MenuItemRecord[] {
  return flat.filter((row) => row.pid === pid).sort((a, b) => a.sort - b.sort);
}

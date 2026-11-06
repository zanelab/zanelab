import { describe, expect, it } from 'vitest';
import { buildTree, countWithDescendants, childrenOf } from './menu-tree';
import type { MenuItemRecord } from '../api/menus';

/** 构造行的小助手（只填树操作关心的字段）。 */
function row(
  id: number,
  pid: number | null,
  sort = 0,
  extra?: Partial<MenuItemRecord>,
): MenuItemRecord {
  return {
    id,
    pid,
    permission: null,
    name: `n${id}`,
    component: '',
    uri: null,
    type: 'menu',
    sort,
    icon: null,
    activeIcon: null,
    hidden: false,
    scopes: ['C'],
    ...extra,
  };
}

describe('buildTree', () => {
  it('pid 关联成树：根在前、兄弟按 sort 升序稳定排序', () => {
    const tree = buildTree([
      row(3, null, 3),
      row(1, null, 1),
      row(11, 1, 2),
      row(12, 1, 1),
      row(111, 11, 0),
    ]);
    // 根按 sort：1 在 3 前
    expect(tree.map((n) => n.id)).toEqual([1, 3]);
    // 1 的孩子按 sort：12(1) 在 11(2) 前
    expect(tree[0].children?.map((n) => n.id)).toEqual([12, 11]);
    // 深层嵌套
    expect(tree[0].children?.[1].children?.map((n) => n.id)).toEqual([111]);
  });

  it('孤儿节点（pid 指向不存在的行）按根处理，不丢数据', () => {
    const tree = buildTree([row(1, null, 0), row(99, 42, 5)]);
    expect(tree.map((n) => n.id).sort()).toEqual([1, 99]);
  });

  it('叶子节点 children 收敛为 undefined（旧契约 children 可空语义）', () => {
    const tree = buildTree([row(1, null, 0)]);
    expect(tree[0].children).toBeUndefined();
  });
});

describe('countWithDescendants', () => {
  const flat = [
    row(1, null),
    row(11, 1),
    row(111, 11),
    row(12, 1),
    row(2, null),
  ];

  it('计自身 + 全部后代（多级）', () => {
    expect(countWithDescendants(flat, 1)).toBe(4); // 1, 11, 111, 12
    expect(countWithDescendants(flat, 11)).toBe(2); // 11, 111
    expect(countWithDescendants(flat, 2)).toBe(1); // 叶子 = 自身
  });
});

describe('childrenOf', () => {
  const flat = [row(1, null, 2), row(11, 1, 1), row(12, 1, 0), row(2, null, 5)];

  it('取直接子节点并按 sort 排序；null pid 取根级', () => {
    // 根级：1(sort 2) 在 2(sort 5) 前
    expect(childrenOf(flat, null).map((n) => n.id)).toEqual([1, 2]);
    // 1 的孩子按 sort：12(0) 在 11(1) 前
    expect(childrenOf(flat, 1).map((n) => n.id)).toEqual([12, 11]);
  });
});

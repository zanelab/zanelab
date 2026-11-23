import type { TFunction } from 'i18next';
import { AGENT_LABEL, type SkillFilterGroup } from './data';

/**
 * 筛选选项 label 的统一解析点（data.ts 不存文案——i18n 规范「模块顶层的选项
 * 数组只存 value/icon，label 在渲染期 t() 解析」）。
 *
 * key 布局：`skills.option.<group>.<value>`（值域含中文——中文值是数据键，
 * 语言包里以原值作 key，见 zh-CN.json option 段）。
 *
 * 特例：agent 组的 label 是品牌全称（AGENT_LABEL），不翻译、不走语言包——
 * 两语言下同形（i18n 规范「刻意保留清单」同类：数据/品牌名非 UI 文案）。
 */
export function optionLabel(
  t: TFunction,
  group: SkillFilterGroup['id'],
  value: string,
): string {
  if (group === 'agent') return AGENT_LABEL[value] ?? value;
  return t(`skills.option.${group}.${value}`);
}

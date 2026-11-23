import type { SkillRecord } from '../../api/skills';
import type { OutputType, SkillItem } from './data';

/**
 * 接口行 → 页面模型（design §7：updatedAt 格式、tone 值域一致；页面模型不新增字段）。
 * - id 随接口契约为 number（DB bigint identity）；SkillItem.id 由旧静态种子的
 * slug 字符串改为 number——筛选/排序/搜索不消费 id，卡片 key 与编辑/删除
 * 回传 API 直接用行 id，无需二次转换。
 * - updatedAt：接口是 ISO datetime，页面模型口径是 'YYYY-MM-DD'（latest 排序
 * localeCompare 前缀等价）；slice 不做 Date 解析，避免时区偏移改变日期。
 * - tone/outputTypes 是收窄类型断言：接口 string 经服务端校验后的值域与
 * 页面模型一致（值域漂移由前端筛选自然吞掉，design §2）。
 */
export function toSkillItem(row: SkillRecord): SkillItem {
  return {
    id: row.id,
    title: row.title,
    free: row.free,
    featured: row.featured,
    outputTypes: row.outputTypes as OutputType[],
    roles: row.roles,
    scenes: row.scenes,
    downloads: row.downloads,
    bookmarks: row.bookmarks,
    rating: row.rating,
    updatedAt: row.updatedAt.slice(0, 10),
    tone: row.tone as SkillItem['tone'],
    agents: row.agents,
  };
}

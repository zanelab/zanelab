import { describe, expect, it } from 'vitest';
import type { OutputType, SkillItem } from './data';
import {
  filterSkills,
  searchSkills,
  sortSkills,
  toggleFilter,
} from './filters';

/*
 * SKILLS 静态种子已迁 supabase/migrations/0002 与 mocks/skill-handlers.ts
 * （11-23-skills-crud-mock：data.ts 只剩类型与筛选选项）。纯函数测试不依赖
 * 数据源——本地构造 fixture（覆盖各分支的最小集 + 原种子关键行），断言语义不变。
 */

/** 原静态种子的关键行（字段值与 mocks/skill-handlers.ts 同源摘录） */
const SKILLS_FIXTURE: SkillItem[] = [
  {
    id: 1,
    title: '薄荷暗夜软件产品官网',
    free: true,
    featured: false,
    outputTypes: ['网页'],
    roles: ['创始人', '设计师'],
    scenes: ['品牌识别'],
    downloads: 340,
    bookmarks: 6,
    rating: 5,
    updatedAt: '2026-11-10',
    tone: 'primary',
    agents: ['CC', 'CX', 'AG', 'CU'],
  },
  {
    id: 2,
    title: '橙焙电单车商店',
    free: true,
    featured: false,
    outputTypes: ['网页', '图像'],
    roles: ['电商卖家'],
    scenes: ['社交媒体', '内容发布'],
    downloads: 241,
    bookmarks: 8,
    rating: 5,
    updatedAt: '2026-11-08',
    tone: 'warning',
    agents: ['CC', 'CX', 'AG', 'CU'],
  },
  {
    id: 11,
    title: '融资路演幻灯片生成',
    free: false,
    featured: true,
    outputTypes: ['幻灯片'],
    roles: ['创始人', '顾问'],
    scenes: ['教学讲解', '内容发布'],
    downloads: 452,
    bookmarks: 31,
    rating: 5,
    updatedAt: '2026-11-11',
    tone: 'info',
    agents: ['CC', 'CX'],
  },
  {
    id: 12,
    title: '短视频产品口播脚本',
    free: false,
    featured: true,
    outputTypes: ['视频'],
    roles: ['营销人员', '内容创作者'],
    scenes: ['社交媒体', '内容发布'],
    downloads: 388,
    bookmarks: 22,
    rating: 4,
    updatedAt: '2026-11-09',
    tone: 'secondary',
    agents: ['CC', 'AG'],
  },
  {
    id: 14,
    title: '课堂教学课件助手',
    free: true,
    featured: false,
    outputTypes: ['幻灯片'],
    roles: ['教师', '研究人员'],
    scenes: ['教学讲解'],
    downloads: 156,
    bookmarks: 9,
    rating: 5,
    updatedAt: '2026-10-30',
    tone: 'success',
    agents: ['CC'],
  },
];

/** 最小合成行（fixture 变体构造用：只覆写指定字段，其余给中性缺省）。 */
function skill(overrides: Partial<SkillItem> & { id: number }): SkillItem {
  return {
    title: `技能${overrides.id}`,
    free: true,
    featured: false,
    outputTypes: [] as OutputType[],
    roles: [],
    scenes: [],
    downloads: 0,
    bookmarks: 0,
    rating: 3,
    updatedAt: '2026-11-01',
    tone: 'primary',
    agents: [],
    ...overrides,
  };
}

describe('filterSkills', () => {
  it('无筛选返回全部', () => {
    expect(filterSkills(SKILLS_FIXTURE, {})).toHaveLength(
      SKILLS_FIXTURE.length,
    );
  });

  it('free 组：免费只保留 free=true', () => {
    const result = filterSkills(SKILLS_FIXTURE, { free: ['free'] });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((s) => s.free)).toBe(true);
  });

  it('featured 组：精选只保留 featured=true', () => {
    const result = filterSkills(SKILLS_FIXTURE, { free: ['featured'] });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((s) => s.featured)).toBe(true);
  });

  it('组内 OR：输出类型勾「幻灯片+视频」= 任一命中即保留', () => {
    const result = filterSkills(SKILLS_FIXTURE, { output: ['幻灯片', '视频'] });
    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every(
        (s) =>
          s.outputTypes.includes('幻灯片') || s.outputTypes.includes('视频'),
      ),
    ).toBe(true);
  });

  it('组间 AND：免费 × 幻灯片求交', () => {
    const result = filterSkills(SKILLS_FIXTURE, {
      free: ['free'],
      output: ['幻灯片'],
    });
    expect(
      result.every((s) => s.free && s.outputTypes.includes('幻灯片')),
    ).toBe(true);
    // fixture 里免费幻灯片正好 1 个（课堂教学课件助手）
    expect(result).toHaveLength(1);
  });

  it('角色组命中 roles', () => {
    const result = filterSkills(SKILLS_FIXTURE, { role: ['教师'] });
    expect(result.every((s) => s.roles.includes('教师'))).toBe(true);
  });

  it('场景组命中 scenes', () => {
    const result = filterSkills(SKILLS_FIXTURE, { scene: ['教学讲解'] });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((s) => s.scenes.includes('教学讲解'))).toBe(true);
  });

  it('边界：值只在所属组的字段匹配，角色值与场景值不交叉命中', () => {
    // 各组的值都是中文字符串；旧的 outputTypes || roles 宽松匹配会把「角色的值」
    // 当成「场景的值」命中。同一字符串分别放进不同组字段，锁死按组 id 分派。
    const sceneSkill = skill({
      id: 1,
      roles: [],
      scenes: ['教学讲解'],
    });
    const roleSkill = skill({
      id: 2,
      roles: ['教学讲解'],
      scenes: [],
    });
    expect(
      filterSkills([sceneSkill, roleSkill], {
        scene: ['教学讲解'],
      }).map((s) => s.id),
    ).toEqual([1]);
    expect(
      filterSkills([sceneSkill, roleSkill], {
        role: ['教学讲解'],
      }).map((s) => s.id),
    ).toEqual([2]);

    // 输出类型同理：roles 里叫「视频」的技能，不该被输出类型筛选命中
    const roleNamedVideo = skill({
      id: 3,
      roles: ['视频'],
      outputTypes: [],
      scenes: [],
    });
    expect(filterSkills([roleNamedVideo], { output: ['视频'] })).toHaveLength(
      0,
    );
  });
});

// 11-16 R7/AC8：agents 提升为可筛选维度。agent 的值是 CC/CX/AG/CU 这类缩写码，
// 与角色/场景/输出类型的中文字符串混在同一个宽松匹配里迟早交叉命中——
// 下面的边界用例就是为此设计的「能证伪弱实现的构造」。
describe('filterSkills —— 按 Agent 维度', () => {
  it('agent 组命中 agents', () => {
    const result = filterSkills(SKILLS_FIXTURE, { agent: ['CX'] });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((s) => s.agents.includes('CX'))).toBe(true);
  });

  it('组内 OR：agent 勾「CC + CU」= 任一命中即保留', () => {
    const result = filterSkills(SKILLS_FIXTURE, { agent: ['CC', 'CU'] });
    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every((s) => s.agents.includes('CC') || s.agents.includes('CU')),
    ).toBe(true);
  });

  it('组间 AND：agent × 输出类型求交', () => {
    const result = filterSkills(SKILLS_FIXTURE, {
      agent: ['CU'],
      output: ['图像'],
    });
    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every(
        (s) => s.agents.includes('CU') && s.outputTypes.includes('图像'),
      ),
    ).toBe(true);
  });

  it('边界：agent 值只在 agents 字段匹配，不与其它的组字段交叉命中', () => {
    // 把同一串缩写码分别放进 agents / roles，锁死「按组 id 分派」：
    // 若 agent 分支落进宽松匹配（任一字段命中），两条都会被命中。
    const inRoles = skill({
      id: 1,
      roles: ['CC'],
      scenes: [],
      outputTypes: [],
      agents: [],
    });
    const inAgents = skill({
      id: 2,
      roles: [],
      scenes: [],
      outputTypes: [],
      agents: ['CC'],
    });
    expect(
      filterSkills([inRoles, inAgents], { agent: ['CC'] }).map((s) => s.id),
    ).toEqual([2]);
    // 反向：缩写码不该被角色 / 场景 / 输出类型筛选命中
    expect(
      filterSkills([inRoles, inAgents], { role: ['CC'] }).map((s) => s.id),
    ).toEqual([1]);
    expect(filterSkills([inRoles, inAgents], { scene: ['CC'] })).toHaveLength(
      0,
    );
    expect(filterSkills([inRoles, inAgents], { output: ['CC'] })).toHaveLength(
      0,
    );
  });
});

describe('searchSkills', () => {
  it('空查询（含全空白）原样返回同一引用', () => {
    // 引用相等是有意的：下游 useMemo 不必因空关键词重排
    expect(searchSkills(SKILLS_FIXTURE, '')).toBe(SKILLS_FIXTURE);
    expect(searchSkills(SKILLS_FIXTURE, '   ')).toBe(SKILLS_FIXTURE);
  });

  it('title 子串命中', () => {
    expect(searchSkills(SKILLS_FIXTURE, '薄荷').map((s) => s.id)).toEqual([1]);
  });

  it('roles 子串命中', () => {
    // 「教师」只出现在 roles（不是任何 title / scene / agent）
    expect(searchSkills(SKILLS_FIXTURE, '教师').map((s) => s.id)).toEqual([14]);
  });

  it('scenes 子串命中', () => {
    expect(searchSkills(SKILLS_FIXTURE, '教学讲解').map((s) => s.id)).toEqual([
      11, 14,
    ]);
  });

  it('outputTypes 子串命中', () => {
    expect(searchSkills(SKILLS_FIXTURE, '图像').map((s) => s.id)).toEqual([2]);
  });

  it('agents 子串命中：缩写码与全称都能搜到，且不区分大小写', () => {
    // 全称（Codex）与缩写码（CX）指向同一批技能
    const byName = searchSkills(SKILLS_FIXTURE, 'codex').map((s) => s.id);
    expect(byName).toEqual(
      searchSkills(SKILLS_FIXTURE, 'Codex').map((s) => s.id),
    );
    expect(byName).toEqual(searchSkills(SKILLS_FIXTURE, 'cx').map((s) => s.id));
    expect(byName).toEqual(searchSkills(SKILLS_FIXTURE, 'CX').map((s) => s.id));
    expect(byName.length).toBeGreaterThan(0);
    expect(
      SKILLS_FIXTURE.filter((s) => byName.includes(s.id)).every((s) =>
        s.agents.includes('CX'),
      ),
    ).toBe(true);
    // 全称逐条覆盖：Cursor 只在 agents 含 CU 的技能里命中
    const byCursor = searchSkills(SKILLS_FIXTURE, 'Cursor').map((s) => s.id);
    expect(byCursor.length).toBeGreaterThan(0);
    expect(
      SKILLS_FIXTURE.filter((s) => byCursor.includes(s.id)).every((s) =>
        s.agents.includes('CU'),
      ),
    ).toBe(true);
  });

  it('与筛选叠加为 AND：被筛选排除的技能不会被搜索拉回来', () => {
    // 「顾问」命中付费的 融资路演幻灯片生成；叠加「免费」后应为空
    expect(searchSkills(SKILLS_FIXTURE, '顾问').map((s) => s.id)).toEqual([11]);
    expect(
      searchSkills(filterSkills(SKILLS_FIXTURE, { free: ['free'] }), '顾问'),
    ).toHaveLength(0);
    // 反向：过滤后仍命中的保留
    expect(
      searchSkills(
        filterSkills(SKILLS_FIXTURE, { free: ['free'] }),
        '教师',
      ).map((s) => s.id),
    ).toEqual([14]);
  });

  it('不突变入参数组', () => {
    const before = SKILLS_FIXTURE.map((s) => s.id);
    searchSkills(SKILLS_FIXTURE, '薄荷');
    expect(SKILLS_FIXTURE.map((s) => s.id)).toEqual(before);
  });
});

describe('sortSkills', () => {
  it('recommended 不改动种子顺序', () => {
    expect(sortSkills(SKILLS_FIXTURE, 'recommended').map((s) => s.id)).toEqual(
      SKILLS_FIXTURE.map((s) => s.id),
    );
  });

  it('popular 按 downloads 降序', () => {
    const result = sortSkills(SKILLS_FIXTURE, 'popular');
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].downloads).toBeGreaterThanOrEqual(
        result[i].downloads,
      );
    }
  });

  it('latest 按 updatedAt 降序', () => {
    const result = sortSkills(SKILLS_FIXTURE, 'latest');
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].updatedAt >= result[i].updatedAt).toBe(true);
    }
  });

  it('rating 按 rating 降序、同分按 downloads', () => {
    const result = sortSkills(SKILLS_FIXTURE, 'rating');
    for (let i = 1; i < result.length; i++) {
      const prev = result[i - 1];
      const cur = result[i];
      expect(prev.rating).toBeGreaterThanOrEqual(cur.rating);
      if (prev.rating === cur.rating) {
        expect(prev.downloads).toBeGreaterThanOrEqual(cur.downloads);
      }
    }
  });

  it('不突变入参数组', () => {
    const before = SKILLS_FIXTURE.map((s) => s.id);
    sortSkills(SKILLS_FIXTURE, 'popular');
    expect(SKILLS_FIXTURE.map((s) => s.id)).toEqual(before);
  });
});

describe('toggleFilter', () => {
  it('勾选加入组', () => {
    expect(toggleFilter({}, 'output', '网页')).toEqual({
      output: ['网页'],
    });
  });

  it('重复勾选取消', () => {
    const active = toggleFilter({}, 'output', '网页');
    expect(toggleFilter(active, 'output', '网页')).toEqual({ output: [] });
  });

  it('不突变入参', () => {
    const active = { output: ['网页'] };
    toggleFilter(active, 'output', '视频');
    expect(active).toEqual({ output: ['网页'] });
  });
});

import { describe, expect, it } from 'vitest';
import { SKILLS, type SkillItem } from './data';
import {
  filterSkills,
  searchSkills,
  sortSkills,
  toggleFilter,
} from './filters';

describe('filterSkills', () => {
  it('无筛选返回全部', () => {
    expect(filterSkills(SKILLS, {})).toHaveLength(SKILLS.length);
  });

  it('free 组：免费只保留 free=true', () => {
    const result = filterSkills(SKILLS, { free: ['free'] });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((s) => s.free)).toBe(true);
  });

  it('featured 组：精选只保留 featured=true', () => {
    const result = filterSkills(SKILLS, { free: ['featured'] });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((s) => s.featured)).toBe(true);
  });

  it('组内 OR：输出类型勾「幻灯片+视频」= 任一命中即保留', () => {
    const result = filterSkills(SKILLS, { output: ['幻灯片', '视频'] });
    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every(
        (s) =>
          s.outputTypes.includes('幻灯片') || s.outputTypes.includes('视频'),
      ),
    ).toBe(true);
  });

  it('组间 AND：免费 × 幻灯片求交', () => {
    const result = filterSkills(SKILLS, { free: ['free'], output: ['幻灯片'] });
    expect(
      result.every((s) => s.free && s.outputTypes.includes('幻灯片')),
    ).toBe(true);
    // 种子里免费幻灯片正好 1 个（course-slides）
    expect(result).toHaveLength(1);
  });

  it('角色组命中 roles', () => {
    const result = filterSkills(SKILLS, { role: ['教师'] });
    expect(result.every((s) => s.roles.includes('教师'))).toBe(true);
  });

  it('场景组命中 scenes', () => {
    const result = filterSkills(SKILLS, { scene: ['知识解释与教学'] });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((s) => s.scenes.includes('知识解释与教学'))).toBe(true);
  });

  it('边界：值只在所属组的字段匹配，角色值与场景值不交叉命中', () => {
    // 各组的值都是中文字符串；旧的 outputTypes || roles 宽松匹配会把「角色的值」
    // 当成「场景的值」命中。同一字符串分别放进不同组字段，锁死按组 id 分派。
    const sceneSkill: SkillItem = {
      ...SKILLS[0],
      id: 'scene-hit',
      roles: [],
      scenes: ['知识解释与教学'],
    };
    const roleSkill: SkillItem = {
      ...SKILLS[0],
      id: 'role-hit',
      roles: ['知识解释与教学'],
      scenes: [],
    };
    expect(
      filterSkills([sceneSkill, roleSkill], {
        scene: ['知识解释与教学'],
      }).map((s) => s.id),
    ).toEqual(['scene-hit']);
    expect(
      filterSkills([sceneSkill, roleSkill], {
        role: ['知识解释与教学'],
      }).map((s) => s.id),
    ).toEqual(['role-hit']);

    // 输出类型同理：roles 里叫「视频」的技能，不该被输出类型筛选命中
    const roleNamedVideo: SkillItem = {
      ...SKILLS[0],
      id: 'role-video',
      roles: ['视频'],
      outputTypes: [],
      scenes: [],
    };
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
    const result = filterSkills(SKILLS, { agent: ['CX'] });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((s) => s.agents.includes('CX'))).toBe(true);
  });

  it('组内 OR：agent 勾「CC + CU」= 任一命中即保留', () => {
    const result = filterSkills(SKILLS, { agent: ['CC', 'CU'] });
    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every((s) => s.agents.includes('CC') || s.agents.includes('CU')),
    ).toBe(true);
  });

  it('组间 AND：agent × 输出类型求交', () => {
    const result = filterSkills(SKILLS, { agent: ['CU'], output: ['图像'] });
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
    const inRoles: SkillItem = {
      ...SKILLS[0],
      id: 'role-CC',
      roles: ['CC'],
      scenes: [],
      outputTypes: [],
      agents: [],
    };
    const inAgents: SkillItem = {
      ...SKILLS[0],
      id: 'agent-CC',
      roles: [],
      scenes: [],
      outputTypes: [],
      agents: ['CC'],
    };
    expect(
      filterSkills([inRoles, inAgents], { agent: ['CC'] }).map((s) => s.id),
    ).toEqual(['agent-CC']);
    // 反向：缩写码不该被角色 / 场景 / 输出类型筛选命中
    expect(
      filterSkills([inRoles, inAgents], { role: ['CC'] }).map((s) => s.id),
    ).toEqual(['role-CC']);
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
    expect(searchSkills(SKILLS, '')).toBe(SKILLS);
    expect(searchSkills(SKILLS, '   ')).toBe(SKILLS);
  });

  it('title 子串命中', () => {
    expect(searchSkills(SKILLS, '薄荷').map((s) => s.id)).toEqual([
      'landing-dark',
    ]);
  });

  it('roles 子串命中', () => {
    // 「教师」只出现在 roles（不是任何 title / scene / agent）
    expect(searchSkills(SKILLS, '教师').map((s) => s.id)).toEqual([
      'course-slides',
    ]);
  });

  it('scenes 子串命中', () => {
    expect(searchSkills(SKILLS, '知识解释与教学').map((s) => s.id)).toEqual([
      'pitch-deck',
      'course-slides',
    ]);
  });

  it('outputTypes 子串命中', () => {
    expect(searchSkills(SKILLS, '图像').map((s) => s.id)).toEqual([
      'bike-store',
      'greeting-cards',
      'marker-studio',
      'pet-store',
      'illustration-set',
    ]);
  });

  it('agents 子串命中：缩写码与全称都能搜到，且不区分大小写', () => {
    // 全称（Codex）与缩写码（CX）指向同一批技能
    const byName = searchSkills(SKILLS, 'codex').map((s) => s.id);
    expect(byName).toEqual(searchSkills(SKILLS, 'Codex').map((s) => s.id));
    expect(byName).toEqual(searchSkills(SKILLS, 'cx').map((s) => s.id));
    expect(byName).toEqual(searchSkills(SKILLS, 'CX').map((s) => s.id));
    expect(byName.length).toBeGreaterThan(0);
    expect(
      SKILLS.filter((s) => byName.includes(s.id)).every((s) =>
        s.agents.includes('CX'),
      ),
    ).toBe(true);
    // 全称逐条覆盖：Cursor 只在 agents 含 CU 的技能里命中
    const byCursor = searchSkills(SKILLS, 'Cursor').map((s) => s.id);
    expect(byCursor.length).toBeGreaterThan(0);
    expect(
      SKILLS.filter((s) => byCursor.includes(s.id)).every((s) =>
        s.agents.includes('CU'),
      ),
    ).toBe(true);
  });

  it('与筛选叠加为 AND：被筛选排除的技能不会被搜索拉回来', () => {
    // 「顾问」命中付费的 融资路演幻灯片生成；叠加「免费」后应为空
    expect(searchSkills(SKILLS, '顾问').map((s) => s.id)).toEqual([
      'pitch-deck',
    ]);
    expect(
      searchSkills(filterSkills(SKILLS, { free: ['free'] }), '顾问'),
    ).toHaveLength(0);
    // 反向：过滤后仍命中的保留
    expect(
      searchSkills(filterSkills(SKILLS, { free: ['free'] }), '教师').map(
        (s) => s.id,
      ),
    ).toEqual(['course-slides']);
  });

  it('不突变入参数组', () => {
    const before = SKILLS.map((s) => s.id);
    searchSkills(SKILLS, '薄荷');
    expect(SKILLS.map((s) => s.id)).toEqual(before);
  });
});

describe('sortSkills', () => {
  it('recommended 不改动种子顺序', () => {
    expect(sortSkills(SKILLS, 'recommended').map((s) => s.id)).toEqual(
      SKILLS.map((s) => s.id),
    );
  });

  it('popular 按 downloads 降序', () => {
    const result = sortSkills(SKILLS, 'popular');
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].downloads).toBeGreaterThanOrEqual(
        result[i].downloads,
      );
    }
  });

  it('latest 按 updatedAt 降序', () => {
    const result = sortSkills(SKILLS, 'latest');
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].updatedAt >= result[i].updatedAt).toBe(true);
    }
  });

  it('rating 按 rating 降序、同分按 downloads', () => {
    const result = sortSkills(SKILLS, 'rating');
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
    const before = SKILLS.map((s) => s.id);
    sortSkills(SKILLS, 'popular');
    expect(SKILLS.map((s) => s.id)).toEqual(before);
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

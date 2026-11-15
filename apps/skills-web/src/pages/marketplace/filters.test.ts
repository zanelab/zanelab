import { describe, expect, it } from 'vitest';
import { SKILLS, type SkillItem } from './data';
import { filterSkills, sortSkills, toggleFilter } from './filters';

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

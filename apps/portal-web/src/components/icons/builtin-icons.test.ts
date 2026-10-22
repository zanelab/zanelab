import { describe, expect, it } from 'vitest';
import { BUILTIN_ICONS } from './builtin-icons';

function pathsOf(name: string): string[] {
  const icon = BUILTIN_ICONS[name];
  expect(icon, `BUILTIN_ICONS 缺少注册名 "${name}"`).toBeDefined();
  return icon!.paths;
}

describe('BUILTIN_ICONS 收拢转换抽验', () => {
  it('circle-help：circle(r=10) 转双弧 path', () => {
    const paths = pathsOf('circle-help');
    expect(paths).toHaveLength(3);

    expect(paths[0]).toBe('M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0');

    expect(paths[1]).toBe('M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3');
    expect(paths[2]).toBe('M12 17h.01');
  });

  it('chevron-right：polyline(9 18 15 12 9 6) 转 M-L-L', () => {
    expect(pathsOf('chevron-right')).toEqual(['M9 18L15 12L9 6']);
    expect(pathsOf('chevron-down')).toEqual(['M6 9L12 15L18 9']);
  });

  it('lock：rect(3,10,18,12,rx2) 转圆角弧写法', () => {
    const paths = pathsOf('lock');

    expect(paths[0]).toBe('M11 16a1 1 0 1 0 2 0a1 1 0 1 0-2 0');

    expect(paths[1]).toBe(
      'M5 10H19A2 2 0 0 1 21 12V20A2 2 0 0 1 19 22H5A2 2 0 0 1 3 20V12A2 2 0 0 1 5 10Z',
    );

    expect(paths[2]).toBe('M7 10V7a5 5 0 0 1 10 0v3');
  });

  it('close：两条 line 转 path（tabs 版双段合一）', () => {
    expect(pathsOf('close')).toEqual(['M18 6 6 18M6 6l12 12']);
  });

  it('settings：circle(r=3) + 齿轮长 path', () => {
    const paths = pathsOf('settings');
    expect(paths[0]).toBe('M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0');

    expect(paths[1]).toMatch(/^M19\.4 15/);
    expect(paths[1]).toMatch(/1\.51 1z$/);
  });

  it('panel-left：rect(3,3,18,18,rx2) + 分隔线', () => {
    const rectPath =
      'M5 3H19A2 2 0 0 1 21 5V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3Z';
    expect(pathsOf('panel-left')).toEqual([rectPath, 'M9 3v18']);
    expect(pathsOf('panel-right')).toEqual([rectPath, 'M15 3v18']);
    expect(pathsOf('inspection-panel')).toEqual([
      rectPath,
      'M3 15h18',
      'M15 9v6',
      'M9 9v6',
    ]);
  });

  it('log-out：polyline + line 转 path', () => {
    expect(pathsOf('log-out')).toEqual([
      'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4',
      'M16 17L21 12L16 7',
      'M21 12L9 12',
    ]);
  });

  it('sun / sun-moon：circle(r=4) 转弧', () => {
    const sunCircle = 'M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0';
    expect(pathsOf('sun')[0]).toBe(sunCircle);
    expect(pathsOf('sun-moon')[0]).toBe(sunCircle);
  });

  it('D 类：use-tabbar 菜单图标 5 个新注册名存在且非空', () => {
    for (const name of [
      'external-link',
      'close-left',
      'close-right',
      'close-other',
      'close-all',
    ]) {
      const paths = pathsOf(name);
      expect(paths.length).toBeGreaterThan(0);
      expect(paths.every((d) => d.startsWith('M'))).toBe(true);
    }
  });

  it('B-线宽三处收拢条目存在（strokeWidth 统一为 2）', () => {
    for (const name of [
      'layout-sidebar-collapse',
      'layout-sidebar-expand',
      'user-round-pen',
    ]) {
      expect(pathsOf(name).length).toBeGreaterThan(0);
    }
  });
});

describe('近形键互不等值（刻意不合并）', () => {
  const cases: Array<[string, string]> = [
    ['home', 'home-outline'],
    ['moon', 'moon-star'],
    ['system', 'sun-moon'],
    ['pin', 'pin-filled'],
    ['pin-off', 'pin-off-filled'],
    ['refresh-cw', 'rotate-cw'],
  ];

  it.each(cases)('%s ≠ %s', (a, b) => {
    expect(pathsOf(a)).not.toEqual(pathsOf(b));
  });
});

describe('原有菜单标识符键不动', () => {
  it('user/shield/home/system/components/table/button 仍存在', () => {
    for (const key of [
      'user',
      'shield',
      'home',
      'system',
      'components',
      'table',
      'button',
    ]) {
      expect(BUILTIN_ICONS[key]).toBeDefined();
    }
  });
});

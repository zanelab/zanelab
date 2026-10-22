import { describe, expect, it } from 'vitest';
import { PASSWORD_CHAR_CLASSES, PASSWORD_POLICY } from './password-policy';
import { matchPasswordCharClasses, validatePasswordPolicy } from './password';

describe('PASSWORD_POLICY 常量', () => {
  it('与约定的规则取值一致', () => {
    expect(PASSWORD_POLICY.minLength).toBe(8);
    expect(PASSWORD_POLICY.maxLength).toBe(32);
    expect(PASSWORD_POLICY.totalCharClasses).toBe(4);
    expect(PASSWORD_POLICY.requiredCharClasses).toBe(3);
  });

  it('字符类清单与 totalCharClasses 数量一致（避免新增类别时漏配）', () => {
    expect(PASSWORD_CHAR_CLASSES).toHaveLength(
      PASSWORD_POLICY.totalCharClasses,
    );
    expect(Object.keys(PASSWORD_POLICY.patterns).sort()).toEqual(
      [...PASSWORD_CHAR_CLASSES].sort(),
    );
  });

  it('字符类判定正则与约定的字符集一致', () => {
    expect(PASSWORD_POLICY.patterns.lower.test('a')).toBe(true);
    expect(PASSWORD_POLICY.patterns.upper.test('A')).toBe(true);
    expect(PASSWORD_POLICY.patterns.digit.test('7')).toBe(true);

    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    for (const char of symbols) {
      expect(
        PASSWORD_POLICY.patterns.symbol.test(char),
        `符号 ${char} 应命中`,
      ).toBe(true);
    }
  });
});

describe('matchPasswordCharClasses', () => {
  it('逐类识别，顺序固定为 小写→大写→数字→符号', () => {
    expect(matchPasswordCharClasses('Aa1!')).toEqual([
      'lower',
      'upper',
      'digit',
      'symbol',
    ]);
    expect(matchPasswordCharClasses('abcdefgh')).toEqual(['lower']);
    expect(matchPasswordCharClasses('ABCDEFGH')).toEqual(['upper']);
    expect(matchPasswordCharClasses('12345678')).toEqual(['digit']);
    expect(matchPasswordCharClasses('!@#$%^&*')).toEqual(['symbol']);
    expect(matchPasswordCharClasses('中文密码中文密码')).toEqual([]);
  });

  it('无 g 标志的正则可重复调用（不受 lastIndex 影响）', () => {
    expect(matchPasswordCharClasses('Aa1!')).toEqual(
      matchPasswordCharClasses('Aa1!'),
    );
  });
});

describe('validatePasswordPolicy', () => {
  it('长度边界：7 与 33 越界，8 与 32 通过长度校验', () => {
    expect(validatePasswordPolicy('Ab1!Ab1')).toBe('length');
    expect(validatePasswordPolicy(`Ab1!${'a'.repeat(29)}`)).toBe('length');
    expect(validatePasswordPolicy('Ab1!Ab1!')).toBeNull();
    expect(validatePasswordPolicy(`Ab1!${'a'.repeat(28)}`)).toBeNull();
  });

  it('字符类不足 3 类时不通过', () => {
    expect(validatePasswordPolicy('abcdefgh')).toBe('charClasses');
    expect(validatePasswordPolicy('abcdefg1')).toBe('charClasses');
    expect(validatePasswordPolicy('ABCDEFG1')).toBe('charClasses');
  });

  it('覆盖 3 类或 4 类时通过（顺序无关）', () => {
    expect(validatePasswordPolicy('abcdefG1')).toBeNull();
    expect(validatePasswordPolicy('abcdefg1!')).toBeNull();
    expect(validatePasswordPolicy('ABCDEFG1!')).toBeNull();
    expect(validatePasswordPolicy('Abcdef1!')).toBeNull();
  });

  it('长度校验优先于字符类校验（同时不满足时先报长度）', () => {
    expect(validatePasswordPolicy('abc')).toBe('length');
  });
});

/**
 * 密码策略常量（与后端 PasswordValidator 一一对应，二者须保持同步）。
 *
 * | 规则项       | 取值                        | 后端封装位置（private/常量）        | 前端常量位置                        |
 * | ------------ | --------------------------- | ----------------------------------- | ----------------------------------- |
 * | 最小长度     | 8                           | PasswordValidator.MIN_LENGTH        | PASSWORD_POLICY.minLength           |
 * | 最大长度     | 32                          | PasswordValidator.MAX_LENGTH        | PASSWORD_POLICY.maxLength           |
 * | 字符类总数   | 4                           | PasswordValidator.TOTAL_CHAR_CLASSES| PASSWORD_POLICY.totalCharClasses    |
 * | 要求覆盖数   | 3                           | PasswordValidator.REQUIRED_CHAR_CLASSES | PASSWORD_POLICY.requiredCharClasses |
 * | 小写字母     | [a-z]                       | PasswordValidator.HAS_LOWER         | PASSWORD_POLICY.patterns.lower      |
 * | 大写字母     | [A-Z]                       | PasswordValidator.HAS_UPPER         | PASSWORD_POLICY.patterns.upper      |
 * | 数字         | \d                          | PasswordValidator.HAS_DIGIT         | PASSWORD_POLICY.patterns.digit      |
 * | 特殊符号     | !@#$%^&*()_+-=[]{}|;:,.<>?  | PasswordValidator.HAS_SYMBOL        | PASSWORD_POLICY.patterns.symbol     |
 *
 * 判定口径（= 后端 PasswordValidator 的逻辑）：
 *   ① 长度 ∈ [minLength, maxLength]
 *   ② 覆盖的字符类数 ≥ requiredCharClasses（4 类里占 3 类即可）
 * 校验实现见同包 password.ts（validatePasswordPolicy / matchPasswordCharClasses）。
 */
export const PASSWORD_POLICY = {
  /** 最小长度（后端 PasswordValidator.MIN_LENGTH） */
  minLength: 8,

  /** 最大长度（后端 PasswordValidator.MAX_LENGTH） */
  maxLength: 32,

  /** 字符类总数（后端 PasswordValidator.TOTAL_CHAR_CLASSES）：小写/大写/数字/特殊符号 */
  totalCharClasses: 4,

  /** 要求覆盖的字符类数（后端 PasswordValidator.REQUIRED_CHAR_CLASSES） */
  requiredCharClasses: 3,

  patterns: {
    lower: /[a-z]/,
    upper: /[A-Z]/,
    digit: /\d/,

    symbol: /[!@#$%^&*()_+=\-[\]{}|;:,.<>?]/,
  },
} as const;

export type PasswordCharClass = keyof typeof PASSWORD_POLICY.patterns;

export const PASSWORD_CHAR_CLASSES: PasswordCharClass[] = [
  'lower',
  'upper',
  'digit',
  'symbol',
];

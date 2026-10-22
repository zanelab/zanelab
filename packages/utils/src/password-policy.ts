export const PASSWORD_POLICY = {
  minLength: 8,

  maxLength: 32,

  totalCharClasses: 4,

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

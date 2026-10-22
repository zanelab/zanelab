import {
  PASSWORD_CHAR_CLASSES,
  PASSWORD_POLICY,
  type PasswordCharClass,
} from './password-policy';

export type PasswordPolicyIssue = 'length' | 'charClasses';

export function matchPasswordCharClasses(
  password: string,
): PasswordCharClass[] {
  return PASSWORD_CHAR_CLASSES.filter((name) =>
    PASSWORD_POLICY.patterns[name].test(password),
  );
}

export function validatePasswordPolicy(
  password: string,
): PasswordPolicyIssue | null {
  if (
    password.length < PASSWORD_POLICY.minLength ||
    password.length > PASSWORD_POLICY.maxLength
  ) {
    return 'length';
  }
  if (
    matchPasswordCharClasses(password).length <
    PASSWORD_POLICY.requiredCharClasses
  ) {
    return 'charClasses';
  }
  return null;
}

# Error Handling

> Error patterns for CLI/tooling utilities in `@zanelab/node-utils`.

---

## Overview

This package is a **tooling utility layer**, not a server or API. Error handling follows CLI-tool patterns: catch, log to stderr, and either throw or return a safe fallback. There are no custom error classes.

---

## Error Handling Patterns

### Pattern 1: Log and re-throw (non-recoverable)

Used when the caller needs to know about the failure and the utility cannot produce a meaningful fallback. This is the most common pattern in this package.

From `tooling/node-utils/src/fs.ts`:

```typescript
export async function outputJSON(
  filePath: string,
  data: any,
  spaces: number = 2,
) {
  try {
    const dir = dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    const jsonData = JSON.stringify(data, null, spaces);
    await fs.writeFile(filePath, jsonData, 'utf8');
  } catch (error) {
    console.error('Error writing JSON file:', error);
    throw error;
  }
}
```

The same pattern appears in `ensureFile` and `readJSON` in `fs.ts`.

### Pattern 2: Log and return safe fallback (degraded operation)

Used when the operation is best-effort and the caller should not crash. From `tooling/node-utils/src/git.ts`:

```typescript
async function getStagedFiles(): Promise<string[]> {
  try {
    // ... execute git diff --staged ...
  } catch (error) {
    console.error('Failed to get staged files:', error);
    return [];  // safe empty fallback
  }
}
```

### Pattern 3: Let spinner handle failure display

The `spinner` utility wraps a callback and uses ora's `.fail()` for user-facing error display, then re-throws:

```typescript
export async function spinner<T>(
  { failedText, successText, title }: SpinnerOptions,
  callback: () => Promise<T>,
): Promise<T> {
  const loading: Ora = ora(title).start();
  try {
    const result = await callback();
    loading.succeed(successText || 'Success!');
    return result;
  } catch (error) {
    loading.fail(failedText || 'Failed!');
    throw error;
  }
}
```

---

## Error Types

No custom error classes are defined in this package. All errors are standard JavaScript `Error` instances thrown by Node.js built-in APIs (`node:fs`) or third-party libraries (`execa`, `prettier`, etc.).

---

## API Error Responses

Not applicable. This package has no HTTP API.

---

## Common Mistakes

1. **Swallowing errors silently** — always `console.error` before return, or re-throw. Empty catch blocks hide failures.
2. **Using `console.log` instead of `console.error`** — stderr is the correct stream for error output in CLI tools.
3. **Forgetting to `await fs.mkdir(dir, { recursive: true })`** before `writeFile` — always ensure the directory exists first (see `outputJSON` and `ensureFile` for the correct pattern).
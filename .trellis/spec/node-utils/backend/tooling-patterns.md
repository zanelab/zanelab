# Tooling Patterns

> Reusable patterns for monorepo tooling, convenience re-exports, and CLI UX.

---

## Overview

This package provides two categories of utilities:

1. **Isomorphic-level helpers** (path, hash, constants) — pure Node.js, testable without fixtures
2. **Tooling-level helpers** (monorepo, git, spinner, prettier) — designed for CLI scripts and build tooling

---

## Pattern: Monorepo-Aware Utilities

These utilities are designed for pnpm monorepos. They locate the workspace root and enumerate packages.

### Finding the monorepo root

From `tooling/node-utils/src/monorepo.ts`:

```typescript
import { findUpSync } from 'find-up';

function findMonorepoRoot(cwd: string = process.cwd()) {
  const lockFile = findUpSync('pnpm-lock.yaml', { cwd, type: 'file' });
  return dirname(lockFile || '');
}
```

Key details:
- Uses `find-up` to walk up the directory tree looking for `pnpm-lock.yaml`
- Defaults to `process.cwd()` — works from any workspace directory or nested subdirectory
- Sync version: file-system walk is fast enough to be synchronous

### Listing monorepo packages

Uses `@manypkg/get-packages` to parse workspace configuration from `pnpm-workspace.yaml`:

```typescript
import { getPackages as getPackagesFunc } from '@manypkg/get-packages';

function getPackagesSync() {
  const root = findMonorepoRoot();
  return getPackagesSyncFunc(root);
}

async function getPackages() {
  const root = findMonorepoRoot();
  return await getPackagesFunc(root);
}

async function getPackage(pkgName: string) {
  const { packages } = await getPackages();
  return packages.find((pkg) => pkg.packageJson.name === pkgName);
}
```

### Usage in CLI scripts

```typescript
import { findMonorepoRoot, getPackages } from '@zanelab/node-utils';

// Find the root from any location
const root = findMonorepoRoot();

// List all workspace packages
const { packages, rootPackage } = await getPackages();
```

---

## Pattern: Convenience Re-exports (Barrel Index)

The barrel `index.ts` (`tooling/node-utils/src/index.ts`) re-exports popular third-party libraries so consumers import everything from one package:

```typescript
export { default as colors } from 'chalk';
export { consola } from 'consola';
export * from 'execa';
export { default as fs } from 'node:fs/promises';
export { type PackageJson, readPackageJSON } from 'pkg-types';
export { rimraf } from 'rimraf';
```

Benefits:
- Single import for tooling scripts: `import { consola, fs, execa, colors } from '@zanelab/node-utils'`
- Version alignment: all consumers get the same version of chalk, execa, etc.
- CJS interop: `export { default as X }` handles `module.exports` defaults cleanly

When adding a new re-export:
1. Add the dependency to `package.json`
2. Add the re-export line to `index.ts`
3. If the library has types, ensure they're either bundled or available via `@types/*`

---

## Pattern: Async Spinner with ora

The `spinner` function wraps an async callback with an ora spinner for CLI UX:

From `tooling/node-utils/src/spinner.ts`:

```typescript
interface SpinnerOptions {
  failedText?: string;
  successText?: string;
  title: string;
}

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
  } finally {
    loading.stop();
  }
}
```

Usage:

```typescript
import { spinner, colors, consola } from '@zanelab/node-utils';

await spinner(
  { title: 'Building packages...', failedText: 'Build failed!' },
  async () => {
    // perform async work
    await buildAll();
  },
);
```

---

## Pattern: Prettier Format on File

The `prettierFormat` function reads a file, resolves its prettier config, formats it, and writes back if changed:

From `tooling/node-utils/src/prettier.ts`:

```typescript
async function prettierFormat(filepath: string) {
  const prettierOptions = await resolveConfig(filepath, {});
  const fileInfo = await getFileInfo(filepath);
  const input = await fs.readFile(filepath, 'utf8');
  const output = await format(input, {
    ...prettierOptions,
    parser: fileInfo.inferredParser as any,
  });
  if (output !== input) {
    await fs.writeFile(filepath, output, 'utf8');
  }
  return output;
}
```

This is designed for programmatic use in scripts (e.g., auto-formatting generated files). It is not a CLI command.

---

## Pattern: Content Hash Generation

The `generatorContentHash` function produces deterministic MD5 hashes:

From `tooling/node-utils/src/hash.ts`:

```typescript
function generatorContentHash(content: string, hashLSize?: number) {
  const hash = createHash('md5').update(content, 'utf8').digest('hex');
  if (hashLSize) {
    return hash.slice(0, hashLSize);
  }
  return hash;
}
```

Use cases: cache keys, change detection, content fingerprinting. The optional `hashLSize` truncates the hex output for shorter keys.
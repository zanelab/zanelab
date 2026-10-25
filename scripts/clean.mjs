// 清空所有 node_modules 目录与 .turbo/cache 缓存。
//
// 用法：node scripts/clean.mjs [--dry-run]
//   --dry-run  只打印将要删除的路径，不实际删除。
//
// 清理范围（从仓库根目录递归发现，自动跳过 node_modules 内部嵌套，
// 无需硬编码各 workspace 包名）：
//   1. 所有 node_modules 目录（含根目录与所有 workspace 成员）
//   2. 所有 .turbo/cache 目录（保留 .turbo 目录本身与 run-summary 等文件）
import { rmSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');

const removed = [];
let failed = 0;

// node_modules 内部还可能嵌套依赖自己的 node_modules（pnpm 虚拟 store 等），
// rmSync 递归删除顶层的即可整体移除，无需逐层下钻
function findTargets(dir, relative = '') {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const full = join(dir, entry.name);
    const rel = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.name === 'node_modules') {
      removed.push(rel);
    } else if (entry.name === '.turbo') {
      const cache = join(full, 'cache');
      if (existsSync(cache)) removed.push(`${rel}/cache`);
    } else if (!entry.name.startsWith('.')) {
      // 不下钻隐藏目录（.git / .trellis / .turbo 等内部不可能有目标）
      findTargets(full, rel);
    }
  }
}

console.log(`Scanning ${root} ...`);
findTargets(root);

if (removed.length === 0) {
  console.log('Nothing to clean.');
  process.exit(0);
}

for (const rel of removed) {
  const full = join(root, rel);
  if (dryRun) {
    console.log(`[dry-run] would remove ${rel}`);
    continue;
  }
  try {
    rmSync(full, { recursive: true, force: true });
    console.log(`removed  ${rel}`);
  } catch (err) {
    failed++;
    console.error(`FAILED   ${rel}: ${err.message}`);
  }
}

const verb = dryRun ? 'would remove' : 'removed';
console.log(
  `\nDone: ${verb} ${removed.length} target(s)${failed ? `, ${failed} failed` : ''}.`,
);
if (failed && !dryRun) process.exit(1);

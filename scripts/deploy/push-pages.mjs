#!/usr/bin/env node
/**
 * 推送 stage 到 GitHub Pages 用户站点仓库（zanelab.github.io，任务 11-08-github-pages-release）。
 *
 * 该仓库 Pages 为 legacy 构建型（分支 main / 路径 /），push main 根目录即发布；
 * 不能用 actions/deploy-pages（那是本仓库 artifact 部署，落到项目站点子路径）。
 *
 * 安全约定：
 * - **保留**目标仓库现有 CNAME（zanelab.vip）与 README.md——清空时排除，不被部署内容覆盖
 *   （CNAME 丢失 = 自定义域名解析失效）
 * - .git 必须保留（push 依赖）；.github 目标仓库自有（保留，避免误删其配置）
 * - 推送前 commit 为空时跳过（幂等：同内容 tag 重跑不产生空提交）
 *
 * 鉴权：GIT_TOKEN 环境变量（fine-grained PAT，zanelab.github.io Contents: Read and write）。
 *
 * 用法：
 *   GIT_TOKEN=<pat> node scripts/deploy/push-pages.mjs [--stage <dir>] \
 *     [--repo https://github.com/zanelab/zanelab.github.io.git] [--branch main] \
 *     [--message "deploy: v1.2.3"] [--dry-run]
 */
import { existsSync, mkdtempSync, readdirSync, rmSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** 保留项：目标仓库根下这些路径不被部署内容清除/覆盖 */
const PRESERVE = ['CNAME', 'README.md', '.github'];

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (['--stage', '--repo', '--branch', '--message'].includes(a))
      out[a.slice(2)] = argv[++i];
    else if (a === '--dry-run') out.dryRun = true;
  }
  return out;
}

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], {
    stdio: ['ignore', 'pipe', 'pipe'],
  })
    .toString()
    .trim();
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const stage = resolve(args.stage ?? `${repoRoot}/stage-pages`);
  const repoUrl =
    args.repo ?? 'https://github.com/zanelab/zanelab.github.io.git';
  const branch = args.branch ?? 'main';
  const message = args.message ?? 'deploy: pages release';
  const token = process.env.GIT_TOKEN;

  if (!existsSync(`${stage}/index.html`)) {
    console.error(
      `[push-pages] ✗ stage 不存在或缺 index.html：${stage}（先跑 assemble.mjs）`,
    );
    process.exit(1);
  }
  if (!token && !args.dryRun) {
    console.error(
      '[push-pages] ✗ 缺 GIT_TOKEN 环境变量。一次性准备（owner）：\n' +
        '  1. GitHub → Settings → Developer settings → Fine-grained tokens：\n' +
        '     新建 PAT，Repository access 仅 zanelab.github.io，Permissions → Contents: Read and write\n' +
        '  2. gh secret set GIT_TOKEN -R zanelab/zanelab（或仓库 Settings → Secrets → Actions）\n' +
        '详见 .github/workflows/deploy-pages.yml 头注释。',
    );
    process.exit(1);
  }

  const work = mkdtempSync(`${tmpdir()}/pages-deploy-`);
  const authedUrl = args.dryRun
    ? repoUrl
    : repoUrl.replace('https://', `https://x-access-token:${token}@`);

  try {
    execFileSync(
      'git',
      ['clone', '--depth', '1', '--branch', branch, authedUrl, work],
      {
        stdio: args.dryRun
          ? ['ignore', 'ignore', 'pipe']
          : ['ignore', 'pipe', 'pipe'],
      },
    );

    // 清空工作树（保留 .git 与 PRESERVE 项）
    for (const name of readdirSync(work, { withFileTypes: true })) {
      if (name.name === '.git' || PRESERVE.includes(name.name)) continue;
      rmSync(join(work, name.name), { recursive: true, force: true });
    }
    // 拷入部署内容
    cpSync(stage, work, { recursive: true, force: true });

    git(work, 'add', '-A');
    const hasStaged = git(work, 'diff', '--cached', '--name-only').length > 0;
    if (!hasStaged) {
      console.log('[push-pages] 内容无变化，跳过提交与推送（幂等命中）');
      return;
    }
    if (args.dryRun) {
      console.log('[push-pages] [dry-run] 待提交变更：');
      console.log(git(work, 'diff', '--cached', '--stat'));
      return;
    }
    git(
      work,
      '-c',
      'user.name=zanelab-pages-bot',
      '-c',
      'user.email=actions@users.noreply.github.com',
      'commit',
      '-m',
      message,
    );
    git(work, 'push', 'origin', `HEAD:${branch}`);
    console.log(`[push-pages] ✓ 已推送到 ${repoUrl} (${branch})`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

main();

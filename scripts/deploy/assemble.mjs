#!/usr/bin/env node
/**
 * 站点组装（GitHub Pages 发布流程，任务 11-08-github-pages-release）。
 *
 * 三个 app 的 dist → Pages 站点目录布局（用户站点 = 根路径部署）：
 *
 *   <stage>/                ← portal dist 全量（宿主：index.html/config.js/assets/icons/…）
 *   <stage>/iam/            ← iam dist 全量（--base=/iam/ 构建后资产在 iam/assets/）
 *   <stage>/apps/home/      ← home dist 全量（**不放 stage/home/**：activeRule 是 /home，
 *                              目录放根会让 Pages 把 SPA 路由 /home 当目录 301 到 /home/，
 *                              刷新时 home/index.html 独立态整页替换宿主——2026-11-09 实测。
 *                              挪进 /apps/ 深路径后 /home 走 404.html 兜底回宿主）
 *   <stage>/404.html        ← portal index.html 副本（GH Pages 对未知路径回 404.html 且 URL 不变
 *                              → SPA 深链接 /iam/login 落宿主由 qiankun/路由接管）
 *   <stage>/.nojekyll       ← 跳过 Jekyll 处理
 *   <stage>/CNAME           ← 不由本脚本产出；push 脚本从目标仓库保留（域名解析依赖）
 *
 * 前置：三个 app 已构建完成（workflow 里 iam 以 --base=/iam/、home 以 --base=/apps/home/ 构建）。
 *
 * 用法：
 *   node scripts/deploy/assemble.mjs [--stage <dir>] [--check]
 * 缺省 stage = <repo>/stage-pages。--check 只校验布局与资产前缀，不写文件。
 */
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = {
  portal: resolve(repoRoot, 'apps/portal-web/dist'),
  iam: resolve(repoRoot, 'apps/iam-web/dist'),
  home: resolve(repoRoot, 'apps/home-web/dist'),
};

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--check') out.check = true;
    else if (argv[i] === '--stage') out.stage = argv[++i];
  }
  return out;
}

/** 递归列出相对路径（文件） */
function walk(dir, prefix = '') {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = `${dir}/${name}`;
    const rel = prefix ? `${prefix}/${name}` : name;
    if (existsSync(full) && readdirSync(dir).includes(name)) {
      // isDirectory check via try-read
      let isDir = false;
      try {
        readdirSync(full);
        isDir = true;
      } catch {
        isDir = false;
      }
      if (isDir) out.push(...walk(full, rel));
      else out.push(rel);
    }
  }
  return out;
}

function fail(msg) {
  console.error(`[assemble] ✗ ${msg}`);
  process.exit(1);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const stage = resolve(args.stage ?? `${repoRoot}/stage-pages`);

  // ---- 前置校验 ----
  for (const [app, dist] of Object.entries(DIST)) {
    if (!existsSync(`${dist}/index.html`)) {
      fail(
        `${app} dist 不存在或缺 index.html：${dist}（先构建：pnpm turbo build --filter=@zanelab/${app}）`,
      );
    }
  }

  if (args.check) {
    // --check：对已组装的 stage 校验布局与资产前缀
    for (const p of [
      `${stage}/index.html`,
      `${stage}/config.js`,
      `${stage}/404.html`,
      `${stage}/.nojekyll`,
      `${stage}/iam/index.html`,
      `${stage}/apps/home/index.html`,
    ]) {
      if (!existsSync(p)) fail(`stage 缺少 ${p}`);
    }
    const iamIndex = readFileSync(`${stage}/iam/index.html`, 'utf8');
    if (
      !iamIndex.includes("'/iam/assets/") &&
      !iamIndex.includes('"/iam/assets/')
    ) {
      fail('iam index.html 资产引用未带 /iam/ 前缀——构建时漏了 --base=/iam/');
    }
    const homeIndex = readFileSync(`${stage}/apps/home/index.html`, 'utf8');
    if (
      !homeIndex.includes("'/apps/home/assets/") &&
      !homeIndex.includes('"/apps/home/assets/')
    ) {
      fail(
        'home index.html 资产引用未带 /apps/home/ 前缀——构建时漏了 --base=/apps/home/',
      );
    }
    const portalIndex = readFileSync(`${stage}/index.html`, 'utf8');
    if (portalIndex.includes('src="/zanelab/')) {
      fail('portal index.html 意外带 /zanelab/ 前缀（用户站点应为根路径）');
    }
    console.log('[assemble] ✓ 布局与资产前缀校验通过');
    return;
  }

  // ---- 组装 ----
  rmSync(stage, { recursive: true, force: true });
  mkdirSync(stage, { recursive: true });

  cpSync(DIST.portal, stage, { recursive: true });
  cpSync(DIST.iam, `${stage}/iam`, { recursive: true });
  // home 不放 stage/home/（activeRule /home 会被 Pages 目录化 301，见头注释）
  cpSync(DIST.home, `${stage}/apps/home`, { recursive: true });
  copyFileSync(`${stage}/index.html`, `${stage}/404.html`);
  writeFileSync(`${stage}/.nojekyll`, '');

  console.log(`[assemble] ✓ 已组装: ${stage}`);
  const files = walk(stage);
  console.log(
    `[assemble] ${files.length} 个文件；顶层：${readdirSync(stage).join(', ')}`,
  );
}

main();

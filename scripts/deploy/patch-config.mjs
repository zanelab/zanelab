#!/usr/bin/env node
/**
 * 部署期 config.js 改写（GitHub Pages 发布流程，任务 11-08-github-pages-release）。
 *
 * 仓库内 apps/portal-web/public/config.js 是 **dev 用**运行时配置（相对路径 +
 * vite 代理路由工件）；Pages 上的站点需要直连 Supabase + 同源子应用入口。
 * 本脚本在 CI 里对 **stage 副本**做改写，绝不改仓库文件（--out 缺省覆盖 --config 指向的文件，
 * 用于 stage 内原位改写；仓库文件不该被传进来，--dry-run 可先预览 diff）。
 *
 * 改写项（全部是部署值，非开发开关——见 spec/frontend/env-config-guidelines.md）：
 * - api.baseURL        → Supabase 云基址（host axios 实例拼 baseURL + 完整端点直连）
 * - api.apiKey         → Supabase publishable key（浏览器本就可见，经 http 拦截器注入 apikey 头）
 * - microApps.iam.entry / microApps.home.entry → 同源子目录（'/iam/'、'/home/'）
 * - microApps.iam.props.apiPrefix → ''（集成态 iam api 层不再拼 /iam 前缀，
 *   宿主端点已含完整路径；空串显式传给 apiPrefix()，basename 回退被跳过）
 *
 * 幂等：对已改写的 config 再跑一遍输出不变（entry/apiPrefix 取值覆盖式写入）。
 *
 * 用法：
 *   node scripts/deploy/patch-config.mjs --config <path> \
 *     --api-base-url <url> --api-key <key> \
 *     --entry-iam /iam/ --entry-home /home/ --iam-props-api-prefix '' \
 *     [--out <path>] [--dry-run]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));

/** 极简 CLI 解析（零依赖；--x 值形如 `--x v` 或 `--x=v`；布尔位 `--dry-run`） */
function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      out._.push(a);
      continue;
    }
    const eq = a.indexOf('=');
    if (eq > -1) {
      out[a.slice(2, eq)] = a.slice(eq + 1);
    } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
      out[a.slice(2)] = argv[++i];
    } else {
      out[a.slice(2)] = true;
    }
  }
  return out;
}

/**
 * 从 config.js 源码提取 `window.__APP_CONFIG__ = {...};` 的对象字面量源码。
 * 只认赋值语句本体，不 eval 整个文件（文件里若有其它语句也不受影响）。
 */
function extractObjectSource(source) {
  const marker = 'window.__APP_CONFIG__';
  const at = source.indexOf(marker);
  if (at === -1) {
    throw new Error('config.js 中找不到 window.__APP_CONFIG__');
  }
  const eq = source.indexOf('=', at);
  if (eq === -1) throw new Error('window.__APP_CONFIG__ 后找不到 =');
  const start = source.indexOf('{', eq);
  if (start === -1) throw new Error('= 后找不到对象字面量 {');
  // 括号配平（字符串内忽略）：config.js 是仓库自有文件，结构规整，此扫描足够
  let depth = 0;
  let inStr = null;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (inStr) {
      if (ch === '\\') i++;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') inStr = ch;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error('对象字面量未闭合（括号配平失败）');
}

/** 求值对象字面量源码（CI 隔离环境 + 仓库自有文件，非用户输入） */
function evalObject(objSrc) {
  return new Function(`return (${objSrc});`)();
}

/**
 * 改写配置对象（纯函数，供幂等性测试）。
 * 只动四组部署值；未提供的参数对应字段保持原样。
 */
export function patchConfig(cfg, opts) {
  const next = structuredClone(cfg);
  if (opts.apiBaseUrl !== undefined) {
    next.api = { ...next.api, baseURL: opts.apiBaseUrl };
  }
  if (opts.apiKey !== undefined) {
    next.api = { ...next.api, apiKey: opts.apiKey };
  }
  if (opts.entryIam !== undefined && next.microApps?.iam) {
    next.microApps.iam = { ...next.microApps.iam, entry: opts.entryIam };
  }
  if (opts.entryHome !== undefined && next.microApps?.home) {
    next.microApps.home = { ...next.microApps.home, entry: opts.entryHome };
  }
  if (opts.iamPropsApiPrefix !== undefined && next.microApps?.iam) {
    const props = { ...(next.microApps.iam.props ?? {}) };
    if (opts.iamPropsApiPrefix === '') props.apiPrefix = '';
    else props.apiPrefix = opts.iamPropsApiPrefix;
    next.microApps.iam = { ...next.microApps.iam, props };
  }
  return next;
}

/** 序列化：config.js 是给运维/人读的运行时配置，保持无引号键 + 单引号字符串（与仓库现文件风格一致） */
export function serializeConfig(cfg) {
  const json = JSON.stringify(cfg, null, 2);
  // 键去引号：仅行首（缩进后的键位），值字符串不受影响
  const unquotedKeys = json.replace(/^(\s*)"([A-Za-z0-9_-]+)":/gm, '$1$2:');
  // 双引号字符串值 → 单引号（值内已含单引号的字符串保持双引号，config.js 现值无此情形）
  const singleQuoted = unquotedKeys.replace(/: "((?:[^"\\]|\\.)*)"/g, (m, v) =>
    v.includes("'") && !v.includes('"') ? m : `: '${v}'`,
  );
  return `window.__APP_CONFIG__ = ${singleQuoted};\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args._.length > 0 || !args.config) {
    console.error(
      "用法: node scripts/deploy/patch-config.mjs --config <path> --api-base-url <url> --api-key <key> --entry-iam /iam/ --entry-home /home/ --iam-props-api-prefix '' [--out <path>] [--dry-run]",
    );
    process.exit(2);
  }
  const configPath = resolve(args.config);
  const outPath = resolve(args.out ?? args.config);

  // fail-fast：CI vars 未配置（owner 准备缺失）时静默产出空值配置，会让部署站点
  // 所有 API 401/404 且难排查——这里显式拒绝空值（--api-base-url 为部署必需）
  for (const [flag, label] of [
    ['api-base-url', 'api.baseURL（Supabase 云基址）'],
    ['api-key', 'api.apiKey（publishable key）'],
  ]) {
    if (args[flag] === undefined || args[flag] === '') {
      console.error(
        `[patch-config] ✗ --${flag} 缺失或为空（${label}）。\n` +
          '  CI 里对应 repo variable 未配置？一次性准备见 .github/workflows/deploy-pages.yml 头注释。',
      );
      process.exit(1);
    }
  }

  const raw = readFileSync(configPath, 'utf8');
  const objSrc = extractObjectSource(raw);
  const cfg = evalObject(objSrc);

  const patched = patchConfig(cfg, {
    apiBaseUrl: args['api-base-url'],
    apiKey: args['api-key'],
    entryIam: args['entry-iam'],
    entryHome: args['entry-home'],
    iamPropsApiPrefix: args['iam-props-api-prefix'],
  });
  const output = serializeConfig(patched);

  if (args['dry-run']) {
    console.log(`--- ${configPath}（dry-run，未写入） ---`);
    console.log(output.trimEnd());
    return;
  }
  if (output === raw) {
    console.log(`[patch-config] 无变化（幂等命中）: ${outPath}`);
    // 幂等命中时也落一份输出文件（CI 组装链可能依赖 --out 存在），内容与输入一致
    if (outPath !== configPath) writeFileSync(outPath, output);
    return;
  }
  writeFileSync(outPath, output);
  console.log(`[patch-config] 已写入: ${outPath}`);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}

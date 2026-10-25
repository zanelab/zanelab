#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = path.join(ROOT, '.env.development');

const ENV_KEY = 'VITE_PROXY_TARGET';

const ENVIRONMENTS = {
  local: {
    desc: '本机 Docker/Nginx（localhost:8080）',
    vars: { [ENV_KEY]: 'http://localhost:8080' },
  },
  dev3: {
    desc: '开发联调 dev3',
    vars: {
      [ENV_KEY]: 'http://stand-npa-portal-yundu-dev3-admin.patest.msxf.test',
    },
  },
};

const DEFAULT_ENV = 'local';

const ENV_NAMES = Object.keys(ENVIRONMENTS);

const targetOf = (name) => ENVIRONMENTS[name].vars[ENV_KEY] ?? '';

function readEnvFile() {
  if (!existsSync(ENV_FILE)) return {};
  const map = {};
  for (const line of readFileSync(ENV_FILE, 'utf-8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    map[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return map;
}

function patchEnvFile(overrides) {
  const exists = existsSync(ENV_FILE);
  const content = exists ? readFileSync(ENV_FILE, 'utf-8') : '';
  const eol = exists && content.includes('\r\n') ? '\r\n' : '\n';
  const lines = exists ? content.split(/\r?\n/) : [];

  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

  const pending = new Set(Object.keys(overrides));
  const result = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const eq = trimmed.startsWith('#') ? -1 : trimmed.indexOf('=');
    if (eq === -1) {
      result.push(line);
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    if (pending.has(key)) {
      result.push(`${key}=${overrides[key]}`);
      pending.delete(key);
    } else {
      result.push(line);
    }
  }
  for (const key of pending) result.push(`${key}=${overrides[key]}`);

  writeFileSync(ENV_FILE, result.join(eol) + eol);
}

function select(message, choices, initialIndex) {
  const { stdin, stdout } = process;
  if (!stdin.isTTY || !stdout.isTTY)
    return Promise.resolve(choices[initialIndex].value);

  return new Promise((resolve, reject) => {
    let cursor = initialIndex;
    let drawnLines = 0;

    const draw = () => {
      if (drawnLines > 0) stdout.write(`\x1b[${drawnLines}A`);
      const lines = [message];
      choices.forEach((choice, i) => {
        const active = i === cursor;
        const title = active ? `\x1b[36m${choice.title}\x1b[0m` : choice.title;
        lines.push(
          `${active ? '\x1b[36m❯\x1b[0m' : ' '} ${title}  \x1b[90m${choice.desc}\x1b[0m`,
        );
      });
      for (const line of lines) stdout.write(`\x1b[2K${line}\n`);
      drawnLines = lines.length;
    };

    const cleanup = () => {
      stdin.removeListener('data', onKey);
      stdin.setRawMode(false);
      stdin.pause();

      if (typeof stdin.unref === 'function') stdin.unref();
      stdout.write('\x1b[?25h');
    };

    const onKey = (key) => {
      if (key === '\u0003') {
        cleanup();
        stdout.write('\n');
        process.exit(130);
      }
      if (key === '\u001b[A' || key === 'k') {
        cursor = (cursor - 1 + choices.length) % choices.length;
        draw();
        return;
      }
      if (key === '\u001b[B' || key === 'j') {
        cursor = (cursor + 1) % choices.length;
        draw();
        return;
      }
      if (key === '\r' || key === '\n') {
        cleanup();
        resolve(choices[cursor].value);
        return;
      }

      const num = Number(key);
      if (Number.isInteger(num) && num >= 1 && num <= choices.length) {
        cleanup();
        resolve(choices[num - 1].value);
        return;
      }
      if (key === '\u001b' || key === 'q') {
        cleanup();
        stdout.write('\n');
        reject(new Error('CANCELLED'));
      }
    };

    stdout.write('\x1b[?25l');
    draw();
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf-8');
    stdin.on('data', onKey);
  });
}

function printList() {
  console.log('\n可选环境：');
  for (const name of ENV_NAMES) {
    console.log(
      `  ${name.padEnd(8)} ${targetOf(name)}  (${ENVIRONMENTS[name].desc})`,
    );
  }
  console.log();
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('-h') || args.includes('--help')) {
    console.log('用法：pnpm env:switch [环境名] [--list]');
    printList();
    return;
  }
  if (args.includes('-l') || args.includes('--list')) {
    printList();
    return;
  }

  const current = readEnvFile()[ENV_KEY];
  const currentIndex = ENV_NAMES.findIndex(
    (name) => targetOf(name) === current,
  );
  const initialIndex =
    currentIndex !== -1
      ? currentIndex
      : Math.max(ENV_NAMES.indexOf(DEFAULT_ENV), 0);

  let envName = args.find((arg) => !arg.startsWith('-'));
  if (envName !== undefined) {
    if (!ENVIRONMENTS[envName]) {
      console.error(`未知环境：${envName}\n可选：${ENV_NAMES.join(' / ')}`);
      process.exit(1);
    }
  } else {
    const choices = ENV_NAMES.map((name, i) => ({
      title: `${String(i + 1).padStart(2, ' ')}. ${name}`,
      desc: ENVIRONMENTS[name].desc,
      value: name,
    }));
    console.log();
    envName = await select(
      `请选择开发环境（dev 反代 ${ENV_KEY}，↑/↓ 选择，回车确认）`,
      choices,
      initialIndex,
    );
  }

  patchEnvFile(ENVIRONMENTS[envName].vars);
  console.log(`\n✅ 已选择 [${envName}]，${ENV_KEY}=${targetOf(envName)}\n`);
}

main().catch((err) => {
  if (err instanceof Error && err.message === 'CANCELLED') {
    console.log('已取消，未启动 dev server\n');
  } else {
    console.error(err);
  }
  process.exit(1);
});

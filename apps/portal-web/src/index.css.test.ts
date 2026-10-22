import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src', 'index.css'), 'utf8');

const RUNTIME_MANAGED_VARS = [
  '--primary',
  '--primary-50',
  '--primary-100',
  '--primary-200',
  '--primary-300',
  '--primary-400',
  '--primary-500',
  '--primary-600',
  '--primary-700',
  '--destructive',
  '--success',
  '--warning',
  '--radius',
  '--font-size-base',
  '--menu-font-size',
] as const;

interface TopLevelBlock {
  selector: string;
  body: string;
}

function topLevelBlocks(source: string): TopLevelBlock[] {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks: TopLevelBlock[] = [];
  let cursor = 0;
  while (cursor < withoutComments.length) {
    const open = withoutComments.indexOf('{', cursor);
    if (open === -1) break;
    const selector = withoutComments.slice(cursor, open).trim();
    let depth = 1;
    let close = open + 1;
    while (close < withoutComments.length && depth > 0) {
      const ch = withoutComments[close];
      if (ch === '{') depth += 1;
      else if (ch === '}') depth -= 1;
      close += 1;
    }
    blocks.push({ selector, body: withoutComments.slice(open + 1, close - 1) });
    cursor = close;
  }
  return blocks;
}

function declaresVar(body: string, name: string): boolean {
  return new RegExp(`${name}(?![\\w-])\\s*:`).test(body);
}

function isRootAnchored(selector: string): boolean {
  return selector
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .every((part) => part.startsWith(':root'));
}

describe('index.css 运行时管理变量锚定（09-09 亮色主题色）', () => {
  const blocks = topLevelBlocks(css);

  it('非 :root 锚定的块不得声明运行时管理变量', () => {
    const offenders = blocks
      .filter((block) => !isRootAnchored(block.selector))
      .flatMap((block) =>
        RUNTIME_MANAGED_VARS.filter((name) =>
          declaresVar(block.body, name),
        ).map((name) => `${block.selector} 声明了 ${name}`),
      );
    expect(offenders).toEqual([]);
  });

  it('亮色默认值仍存在于 :root 锚定块中（默认值不丢失）', () => {
    const rootBlocks = blocks.filter((block) => isRootAnchored(block.selector));
    const declares = (name: string, value: string) =>
      rootBlocks.some((block) =>
        new RegExp(
          `${name}(?![\\w-])\\s*:\\s*${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
        ).test(block.body),
      );
    expect(declares('--primary', '212 100% 45%')).toBe(true);
    expect(declares('--radius', '0.5rem')).toBe(true);
    expect(declares('--font-size-base', '16px')).toBe(true);
  });
});

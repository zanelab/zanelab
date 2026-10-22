import { describe, expect, it } from 'vitest';

import { generatorContentHash } from '../index';

describe('consume: node-utils package entry', () => {
  it('produces a deterministic 32-char md5 hash for identical input', () => {
    const first = generatorContentHash('zanelab-node-utils');
    const second = generatorContentHash('zanelab-node-utils');
    expect(first).toBe(second);
    expect(first).toHaveLength(32);
    expect(first).toMatch(/^[0-9a-f]{32}$/);
  });

  it('produces different hashes for different input', () => {
    const first = generatorContentHash('input-a');
    const second = generatorContentHash('input-b');
    expect(first).not.toBe(second);
  });
});

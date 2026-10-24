import { slugProblem } from '@turnero/shared';
import { describe, expect, it } from 'vitest';
import { slugAlternatives } from './slug-alternatives.js';

describe('slugAlternatives', () => {
  it('adds a counter starting at 2', () => {
    expect(slugAlternatives('barberia-el-faro', 3)).toEqual([
      'barberia-el-faro-2',
      'barberia-el-faro-3',
      'barberia-el-faro-4',
    ]);
  });

  it('shortens long slugs so every alternative stays valid', () => {
    const long = `${'a'.repeat(47)}-bc`;

    const alternatives = slugAlternatives(long, 12);

    expect(alternatives[0]).toBe(`${'a'.repeat(47)}-2`);
    expect(alternatives.at(-1)).toBe(`${'a'.repeat(47)}-13`);
    expect(alternatives.every((alternative) => slugProblem(alternative) === null)).toBe(true);
  });
});

import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import './index.js';

describe('zod locale', () => {
  it('uses Spanish for messages the schemas do not customize', () => {
    const result = z.object({ count: z.number() }).safeParse({ count: 'x' });

    expect(result.error?.issues[0]?.message).toMatch(/^Entrada inválida/);
  });
});

import { describe, expect, it } from 'vitest';

describe('@turnero/shared', () => {
  it('loads the package entry point', async () => {
    await expect(import('./index.js')).resolves.toBeDefined();
  });
});

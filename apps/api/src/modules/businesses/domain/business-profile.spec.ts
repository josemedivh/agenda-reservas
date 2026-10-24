import { describe, expect, it } from 'vitest';
import { validateBusinessProfile, validateSlug } from './business-profile.js';
import { InvalidBusinessDataError } from './errors.js';

const valid = {
  name: '  Barbería El Faro ',
  phone: '099 123 4567',
  address: '  Av. 9 de Octubre 100 ',
  timeZone: 'America/Guayaquil',
};

describe('validateBusinessProfile', () => {
  it('returns the cleaned profile', () => {
    expect(validateBusinessProfile(valid)).toEqual({
      name: 'Barbería El Faro',
      phone: '+593991234567',
      address: 'Av. 9 de Octubre 100',
      timeZone: 'America/Guayaquil',
    });
  });

  it('stores a blank address as null', () => {
    expect(validateBusinessProfile({ ...valid, address: '   ' }).address).toBeNull();
    expect(validateBusinessProfile({ ...valid, address: null }).address).toBeNull();
  });

  it.each([
    ['name', { name: 'A' }],
    ['name', { name: 'x'.repeat(81) }],
    ['phone', { phone: '12345' }],
    ['address', { address: 'x'.repeat(201) }],
    ['timeZone', { timeZone: 'Marte/Base' }],
  ])('rejects an invalid %s', (_field, change) => {
    expect(() => validateBusinessProfile({ ...valid, ...change })).toThrow(
      InvalidBusinessDataError,
    );
  });
});

describe('validateSlug', () => {
  it('normalizes case and surrounding spaces', () => {
    expect(validateSlug(' Barberia-El-Faro ')).toBe('barberia-el-faro');
  });

  it.each(['ab', 'panel', 'barbería', 'con espacio'])('rejects %j', (slug) => {
    expect(() => validateSlug(slug)).toThrow(InvalidBusinessDataError);
  });
});

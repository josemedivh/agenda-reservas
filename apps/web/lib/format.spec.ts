import { describe, expect, it } from 'vitest';
import { formatPhone, timeZoneLabel } from './format';

describe('formatPhone', () => {
  it.each([
    ['+593991234567', '099 123 4567'],
    ['+59342601234', '04 260 1234'],
    ['+573105551234', '+573105551234'],
  ])('shows %s as %s', (phone, shown) => {
    expect(formatPhone(phone)).toBe(shown);
  });
});

describe('timeZoneLabel', () => {
  it('uses the friendly name when the zone is offered, the IANA name otherwise', () => {
    expect(timeZoneLabel('America/Guayaquil')).toBe('Ecuador (continental)');
    expect(timeZoneLabel('Asia/Tokyo')).toBe('Asia/Tokyo');
  });
});

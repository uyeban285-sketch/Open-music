import { describe, expect, it } from 'vitest';

import { jaroWinkler } from '../jaro-winkler';

describe('jaroWinkler', () => {
  it('returns 1.0 for identical strings', () => {
    expect(jaroWinkler('hello', 'hello')).toBe(1.0);
  });

  it('returns 1.0 for two empty strings', () => {
    expect(jaroWinkler('', '')).toBe(1.0);
  });

  it('returns 0.0 when one string is empty', () => {
    expect(jaroWinkler('abc', '')).toBe(0.0);
    expect(jaroWinkler('', 'xyz')).toBe(0.0);
  });

  it('returns 0.0 for completely different strings', () => {
    expect(jaroWinkler('abc', 'xyz')).toBe(0.0);
  });

  it('computes correct similarity for martha/marhta (~0.961)', () => {
    const result = jaroWinkler('martha', 'marhta');
    expect(result).toBeCloseTo(0.961, 2);
  });

  it('computes correct similarity for dwayne/duane (~0.84)', () => {
    const result = jaroWinkler('dwayne', 'duane');
    expect(result).toBeCloseTo(0.84, 2);
  });

  it('computes correct similarity for dixon/dicksonx (~0.81)', () => {
    const result = jaroWinkler('dixon', 'dicksonx');
    expect(result).toBeGreaterThan(0.7);
    expect(result).toBeLessThan(0.9);
  });

  it('is symmetric', () => {
    expect(jaroWinkler('abc', 'abd')).toBe(jaroWinkler('abd', 'abc'));
  });

  it('returns value between 0 and 1 for arbitrary strings', () => {
    const result = jaroWinkler('jellyfish', 'smellyfish');
    expect(result).toBeGreaterThanOrEqual(0.0);
    expect(result).toBeLessThanOrEqual(1.0);
  });
});

import { describe, expect, it } from 'vitest';

import { extractAnnotations, normalize } from '../normalize';

describe('normalize', () => {
  it('removes diacritics', () => {
    expect(normalize('café')).toBe('cafe');
    expect(normalize('naïve')).toBe('naive');
    expect(normalize('résumé')).toBe('resume');
  });

  it('converts to lowercase', () => {
    expect(normalize('HELLO WORLD')).toBe('hello world');
  });

  it('removes content in parentheses', () => {
    expect(normalize('Song (Remix)')).toBe('song');
    expect(normalize('Track (feat. Artist)')).toBe('track');
  });

  it('removes content in brackets', () => {
    expect(normalize('Song [Deluxe Edition]')).toBe('song');
  });

  it('unifies feat variants', () => {
    expect(normalize('Song feat. Artist')).toBe('song feat artist');
    expect(normalize('Song ft. Artist')).toBe('song feat artist');
    expect(normalize('Song featuring Artist')).toBe('song feat artist');
    expect(normalize('Song ft Artist')).toBe('song feat artist');
  });

  it('removes Unicode punctuation', () => {
    expect(normalize("don't stop")).toBe('dont stop');
    expect(normalize('rock & roll')).toBe('rock roll');
  });

  it('collapses whitespace', () => {
    expect(normalize('  hello   world  ')).toBe('hello world');
  });

  it('is idempotent', () => {
    const inputs = ['café (Live)', 'Song feat. Artist [Remix]', 'HELLO WORLD!'];
    for (const input of inputs) {
      const once = normalize(input);
      const twice = normalize(once);
      expect(twice).toBe(once);
    }
  });

  it('handles empty string', () => {
    expect(normalize('')).toBe('');
  });
});

describe('extractAnnotations', () => {
  it('detects live annotation', () => {
    const result = extractAnnotations('Song (Live)');
    expect(result.isLive).toBe(true);
    expect(result.explicit).toBe(false);
    expect(result.acoustic).toBe(false);
    expect(result.cleaned).toBe('Song');
  });

  it('detects explicit annotation', () => {
    const result = extractAnnotations('Track [Explicit]');
    expect(result.explicit).toBe(true);
    expect(result.cleaned).toBe('Track');
  });

  it('detects acoustic annotation', () => {
    const result = extractAnnotations('Song (Acoustic Version)');
    expect(result.acoustic).toBe(true);
    expect(result.cleaned).toBe('Song');
  });

  it('detects multiple annotations', () => {
    const result = extractAnnotations('Song (Live) [Explicit]');
    expect(result.isLive).toBe(true);
    expect(result.explicit).toBe(true);
    expect(result.cleaned).toBe('Song');
  });

  it('returns false for all flags when no annotations present', () => {
    const result = extractAnnotations('Regular Song Title');
    expect(result.isLive).toBe(false);
    expect(result.explicit).toBe(false);
    expect(result.acoustic).toBe(false);
    expect(result.cleaned).toBe('Regular Song Title');
  });

  it('is case-insensitive for annotations', () => {
    const result = extractAnnotations('Song (LIVE) [EXPLICIT]');
    expect(result.isLive).toBe(true);
    expect(result.explicit).toBe(true);
  });
});

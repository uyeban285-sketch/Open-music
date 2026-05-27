import { describe, expect, it } from 'vitest';

import { computeConfidence } from '../confidence';
import type { TrackInfo } from '../confidence';

describe('computeConfidence', () => {
  const baseTrack: TrackInfo = {
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    album: 'A Night at the Opera',
    duration: 354,
    isrc: 'GBUM71029604',
    isLive: false,
    explicit: false,
  };

  it('returns confidence >= 0.95 when ISRCs match', () => {
    const trackA = { ...baseTrack };
    const trackB = { ...baseTrack };

    const result = computeConfidence(trackA, trackB);
    expect(result.confidence).toBeGreaterThanOrEqual(0.95);
    expect(result.signals['isrc']).toBe(1);
  });

  it('returns 1.0 when ISRC matches and title/artist are identical', () => {
    const trackA = { ...baseTrack };
    const trackB = { ...baseTrack };

    const result = computeConfidence(trackA, trackB);
    expect(result.confidence).toBe(1.0);
  });

  it('returns 0.95 when ISRC matches but title/artist are different', () => {
    const trackA = { ...baseTrack };
    const trackB = { ...baseTrack, title: 'Completely Different Song', artist: 'Other Band' };

    const result = computeConfidence(trackA, trackB);
    expect(result.confidence).toBe(0.95);
  });

  it('returns ~1.0 for identical tracks without ISRC', () => {
    const trackA = { ...baseTrack, isrc: undefined };
    const trackB = { ...baseTrack, isrc: undefined };

    const result = computeConfidence(trackA, trackB);
    expect(result.confidence).toBeGreaterThan(0.95);
  });

  it('returns low score for completely different tracks', () => {
    const trackA: TrackInfo = {
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      duration: 354,
      isLive: false,
      explicit: false,
    };
    const trackB: TrackInfo = {
      title: 'Smells Like Teen Spirit',
      artist: 'Nirvana',
      duration: 301,
      isLive: false,
      explicit: false,
    };

    const result = computeConfidence(trackA, trackB);
    expect(result.confidence).toBeLessThan(0.5);
  });

  it('penalizes duration difference > 3 seconds', () => {
    const trackA = { ...baseTrack, isrc: undefined, duration: 200 };
    const trackB = { ...baseTrack, isrc: undefined, duration: 204 };

    const result = computeConfidence(trackA, trackB);
    expect(result.signals['durationSim']).toBe(0);
  });

  it('gives full duration sim for identical durations', () => {
    const trackA = { ...baseTrack, isrc: undefined, duration: 200 };
    const trackB = { ...baseTrack, isrc: undefined, duration: 200 };

    const result = computeConfidence(trackA, trackB);
    expect(result.signals['durationSim']).toBe(1);
  });

  it('gives partial duration sim for small difference', () => {
    const trackA = { ...baseTrack, isrc: undefined, duration: 200 };
    const trackB = { ...baseTrack, isrc: undefined, duration: 202 };

    const result = computeConfidence(trackA, trackB);
    expect(result.signals['durationSim']).toBeCloseTo(1 / 3, 5);
  });

  it('returns confidence clamped between 0 and 1', () => {
    const trackA: TrackInfo = {
      title: 'x',
      artist: 'y',
      duration: 0,
      isLive: false,
      explicit: false,
    };
    const trackB: TrackInfo = {
      title: 'a',
      artist: 'b',
      duration: 100,
      isLive: false,
      explicit: false,
    };

    const result = computeConfidence(trackA, trackB);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('uses album similarity when both present', () => {
    const trackA = { ...baseTrack, isrc: undefined };
    const trackB = { ...baseTrack, isrc: undefined, album: 'Completely Different Album' };

    const withSameAlbum = computeConfidence(trackA, { ...baseTrack, isrc: undefined });
    const withDiffAlbum = computeConfidence(trackA, trackB);

    expect(withSameAlbum.confidence).toBeGreaterThan(withDiffAlbum.confidence);
  });

  it('gives 0 albumSim when album is missing from one track', () => {
    const trackA = { ...baseTrack, isrc: undefined };
    const trackB = { ...baseTrack, isrc: undefined, album: undefined };

    const result = computeConfidence(trackA, trackB);
    expect(result.signals['albumSim']).toBe(0);
  });
});

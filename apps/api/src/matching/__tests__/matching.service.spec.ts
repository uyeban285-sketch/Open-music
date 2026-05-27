import { describe, expect, it } from 'vitest';

import type { TrackInfo } from '../confidence';
import { MatchingService } from '../matching.service';

describe('MatchingService', () => {
  const service = new MatchingService();

  const identicalTrack: TrackInfo = {
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    album: 'A Night at the Opera',
    duration: 354,
    isrc: 'GBUM71029604',
    isLive: false,
    explicit: false,
  };

  describe('thresholds', () => {
    it('returns auto_merged when confidence >= 0.9', () => {
      const result = service.decide(identicalTrack, identicalTrack);
      expect(result.status).toBe('auto_merged');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('returns probable_pending when confidence in [0.5, 0.9)', () => {
      const trackA: TrackInfo = {
        title: 'Bohemian Rhapsody',
        artist: 'Queen',
        duration: 354,
        isLive: false,
        explicit: false,
      };
      const trackB: TrackInfo = {
        title: 'Bohemian Rhapsody Remastered',
        artist: 'Queen Band',
        duration: 360,
        isLive: false,
        explicit: false,
      };

      const result = service.decide(trackA, trackB);
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.confidence).toBeLessThan(0.9);
      expect(result.status).toBe('probable_pending');
    });

    it('returns no_link when confidence < 0.5', () => {
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

      const result = service.decide(trackA, trackB);
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.status).toBe('no_link');
    });
  });

  describe('live guard', () => {
    it('blocks auto_merge when isLive differs', () => {
      const trackA = { ...identicalTrack, isLive: false };
      const trackB = { ...identicalTrack, isLive: true };

      const result = service.decide(trackA, trackB);
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.status).toBe('probable_pending');
      expect(result.blocked).toBe('live_mismatch');
    });
  });

  describe('explicit guard', () => {
    it('blocks auto_merge when explicit differs', () => {
      const trackA = { ...identicalTrack, explicit: false };
      const trackB = { ...identicalTrack, explicit: true };

      const result = service.decide(trackA, trackB);
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.status).toBe('probable_pending');
      expect(result.blocked).toBe('explicit_mismatch');
    });
  });

  describe('guard priority', () => {
    it('live_mismatch takes priority over explicit_mismatch', () => {
      const trackA = { ...identicalTrack, isLive: false, explicit: false };
      const trackB = { ...identicalTrack, isLive: true, explicit: true };

      const result = service.decide(trackA, trackB);
      expect(result.blocked).toBe('live_mismatch');
    });
  });

  describe('no blocked field when no guard triggered', () => {
    it('does not include blocked when guards pass', () => {
      const result = service.decide(identicalTrack, identicalTrack);
      expect(result.blocked).toBeUndefined();
    });
  });
});

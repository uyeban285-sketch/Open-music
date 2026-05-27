import { describe, expect, it } from 'vitest';

import { applyCommand } from '../playback-state';
import type { PlaybackSessionState } from '../playback-state';

function createDefaultSession(overrides?: Partial<PlaybackSessionState>): PlaybackSessionState {
  return {
    state: 'idle',
    currentTrackId: null,
    positionMs: 0,
    queue: [],
    queueIndex: 0,
    shuffle: false,
    repeatMode: 'off',
    volume: 100,
    revision: 0n,
    ...overrides,
  };
}

describe('applyCommand', () => {
  describe('play', () => {
    it('play from idle with trackId transitions to playing', () => {
      const session = createDefaultSession();
      const result = applyCommand(session, { type: 'play', trackId: 'track-1' });

      expect(result.state).toBe('playing');
      expect(result.currentTrackId).toBe('track-1');
      expect(result.positionMs).toBe(0);
    });

    it('play from paused resumes to playing', () => {
      const session = createDefaultSession({
        state: 'paused',
        currentTrackId: 'track-1',
        positionMs: 5000,
      });
      const result = applyCommand(session, { type: 'play' });

      expect(result.state).toBe('playing');
      expect(result.currentTrackId).toBe('track-1');
      expect(result.positionMs).toBe(5000);
    });

    it('play from idle with non-empty queue plays first track', () => {
      const session = createDefaultSession({ queue: ['track-a', 'track-b', 'track-c'] });
      const result = applyCommand(session, { type: 'play' });

      expect(result.state).toBe('playing');
      expect(result.currentTrackId).toBe('track-a');
      expect(result.queueIndex).toBe(0);
      expect(result.positionMs).toBe(0);
    });

    it('play with trackId that is in queue sets queueIndex', () => {
      const session = createDefaultSession({ queue: ['t1', 't2', 't3'] });
      const result = applyCommand(session, { type: 'play', trackId: 't2' });

      expect(result.currentTrackId).toBe('t2');
      expect(result.queueIndex).toBe(1);
    });
  });

  describe('pause', () => {
    it('pause from playing transitions to paused', () => {
      const session = createDefaultSession({ state: 'playing', currentTrackId: 'track-1' });
      const result = applyCommand(session, { type: 'pause' });

      expect(result.state).toBe('paused');
    });

    it('pause from idle stays idle', () => {
      const session = createDefaultSession({ state: 'idle' });
      const result = applyCommand(session, { type: 'pause' });

      expect(result.state).toBe('idle');
    });
  });

  describe('seek', () => {
    it('seek updates positionMs', () => {
      const session = createDefaultSession({ state: 'playing', positionMs: 1000 });
      const result = applyCommand(session, { type: 'seek', positionMs: 5000 });

      expect(result.positionMs).toBe(5000);
    });

    it('seek clamps negative values to 0', () => {
      const session = createDefaultSession({ state: 'playing', positionMs: 1000 });
      const result = applyCommand(session, { type: 'seek', positionMs: -500 });

      expect(result.positionMs).toBe(0);
    });
  });

  describe('next', () => {
    it('next advances queueIndex', () => {
      const session = createDefaultSession({
        state: 'playing',
        queue: ['t1', 't2', 't3'],
        queueIndex: 0,
        currentTrackId: 't1',
      });
      const result = applyCommand(session, { type: 'next' });

      expect(result.queueIndex).toBe(1);
      expect(result.currentTrackId).toBe('t2');
      expect(result.state).toBe('playing');
    });

    it('next at end with repeat=all wraps to 0', () => {
      const session = createDefaultSession({
        state: 'playing',
        queue: ['t1', 't2', 't3'],
        queueIndex: 2,
        currentTrackId: 't3',
        repeatMode: 'all',
      });
      const result = applyCommand(session, { type: 'next' });

      expect(result.queueIndex).toBe(0);
      expect(result.currentTrackId).toBe('t1');
      expect(result.state).toBe('playing');
    });

    it('next at end with repeat=off goes idle', () => {
      const session = createDefaultSession({
        state: 'playing',
        queue: ['t1', 't2', 't3'],
        queueIndex: 2,
        currentTrackId: 't3',
        repeatMode: 'off',
      });
      const result = applyCommand(session, { type: 'next' });

      expect(result.state).toBe('idle');
      expect(result.positionMs).toBe(0);
    });

    it('next with repeat=one restarts same track', () => {
      const session = createDefaultSession({
        state: 'playing',
        queue: ['t1', 't2'],
        queueIndex: 0,
        currentTrackId: 't1',
        repeatMode: 'one',
        positionMs: 50000,
      });
      const result = applyCommand(session, { type: 'next' });

      expect(result.queueIndex).toBe(0);
      expect(result.positionMs).toBe(0);
      expect(result.state).toBe('playing');
    });
  });

  describe('prev', () => {
    it('prev with positionMs > 3000 restarts current track', () => {
      const session = createDefaultSession({
        state: 'playing',
        queue: ['t1', 't2', 't3'],
        queueIndex: 1,
        currentTrackId: 't2',
        positionMs: 5000,
      });
      const result = applyCommand(session, { type: 'prev' });

      expect(result.queueIndex).toBe(1);
      expect(result.currentTrackId).toBe('t2');
      expect(result.positionMs).toBe(0);
    });

    it('prev with positionMs <= 3000 goes to previous track', () => {
      const session = createDefaultSession({
        state: 'playing',
        queue: ['t1', 't2', 't3'],
        queueIndex: 2,
        currentTrackId: 't3',
        positionMs: 2000,
      });
      const result = applyCommand(session, { type: 'prev' });

      expect(result.queueIndex).toBe(1);
      expect(result.currentTrackId).toBe('t2');
      expect(result.positionMs).toBe(0);
    });

    it('prev at beginning of queue stays at 0', () => {
      const session = createDefaultSession({
        state: 'playing',
        queue: ['t1', 't2'],
        queueIndex: 0,
        currentTrackId: 't1',
        positionMs: 1000,
      });
      const result = applyCommand(session, { type: 'prev' });

      expect(result.queueIndex).toBe(0);
      expect(result.currentTrackId).toBe('t1');
    });
  });

  describe('setQueue', () => {
    it('setQueue replaces queue and resets queueIndex', () => {
      const session = createDefaultSession({
        queue: ['old-1', 'old-2'],
        queueIndex: 1,
      });
      const result = applyCommand(session, {
        type: 'setQueue',
        trackIds: ['new-1', 'new-2', 'new-3'],
      });

      expect(result.queue).toEqual(['new-1', 'new-2', 'new-3']);
      expect(result.queueIndex).toBe(0);
    });
  });

  describe('reorder', () => {
    it('reorder moves item in queue', () => {
      const session = createDefaultSession({ queue: ['a', 'b', 'c', 'd'] });
      const result = applyCommand(session, { type: 'reorder', from: 0, to: 2 });

      expect(result.queue).toEqual(['b', 'c', 'a', 'd']);
    });

    it('reorder with out-of-bounds indices does not modify queue', () => {
      const session = createDefaultSession({ queue: ['a', 'b', 'c'] });
      const result = applyCommand(session, { type: 'reorder', from: 5, to: 0 });

      expect(result.queue).toEqual(['a', 'b', 'c']);
    });
  });

  describe('setShuffle', () => {
    it('sets shuffle flag', () => {
      const session = createDefaultSession({ shuffle: false });
      const result = applyCommand(session, { type: 'setShuffle', enabled: true });

      expect(result.shuffle).toBe(true);
    });
  });

  describe('setRepeat', () => {
    it('sets repeat mode', () => {
      const session = createDefaultSession({ repeatMode: 'off' });
      const result = applyCommand(session, { type: 'setRepeat', mode: 'all' });

      expect(result.repeatMode).toBe('all');
    });
  });

  describe('setVolume', () => {
    it('sets volume within range', () => {
      const session = createDefaultSession({ volume: 100 });
      const result = applyCommand(session, { type: 'setVolume', level: 50 });

      expect(result.volume).toBe(50);
    });

    it('clamps volume above 100 to 100', () => {
      const session = createDefaultSession({ volume: 50 });
      const result = applyCommand(session, { type: 'setVolume', level: 150 });

      expect(result.volume).toBe(100);
    });

    it('clamps volume below 0 to 0', () => {
      const session = createDefaultSession({ volume: 50 });
      const result = applyCommand(session, { type: 'setVolume', level: -10 });

      expect(result.volume).toBe(0);
    });
  });

  describe('revision', () => {
    it('increments revision on each command', () => {
      const session = createDefaultSession({ revision: 5n });
      const result = applyCommand(session, { type: 'pause' });

      expect(result.revision).toBe(6n);
    });

    it('increments revision on multiple commands', () => {
      let session = createDefaultSession({ revision: 0n });
      session = applyCommand(session, { type: 'setVolume', level: 80 });
      session = applyCommand(session, { type: 'setShuffle', enabled: true });
      session = applyCommand(session, { type: 'setRepeat', mode: 'all' });

      expect(session.revision).toBe(3n);
    });
  });
});

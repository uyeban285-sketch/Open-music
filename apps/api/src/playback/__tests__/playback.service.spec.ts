import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlaybackService } from '../playback.service';

const mockSession = {
  id: 'session-1',
  userId: 'user-1',
  revision: 0n,
  state: 'idle',
  currentTrackId: null,
  positionMs: 0,
  queue: [],
  shuffle: false,
  repeatMode: 'off',
  volume: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  playbackSession: {
    upsert: vi.fn(),
    update: vi.fn(),
  },
};

describe('PlaybackService', () => {
  let service: PlaybackService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PlaybackService(mockPrisma as any);
  });

  describe('getState', () => {
    it('creates new session if none exists via upsert', async () => {
      mockPrisma.playbackSession.upsert.mockResolvedValue({ ...mockSession });

      const result = await service.getState('user-1');

      expect(mockPrisma.playbackSession.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        create: { userId: 'user-1' },
        update: {},
      });
      expect(result.state).toBe('idle');
      expect(result.revision).toBe(0n);
      expect(result.queue).toEqual([]);
    });
  });

  describe('executeCommand', () => {
    it('loads, applies play command, and saves', async () => {
      mockPrisma.playbackSession.upsert.mockResolvedValue({ ...mockSession });
      mockPrisma.playbackSession.update.mockResolvedValue({});

      const result = await service.executeCommand('user-1', { type: 'play', trackId: 'track-1' });

      expect(result.state).toBe('playing');
      expect(result.currentTrackId).toBe('track-1');
      expect(result.revision).toBe(1n);
      expect(mockPrisma.playbackSession.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: expect.objectContaining({
          state: 'playing',
          currentTrackId: 'track-1',
          positionMs: 0,
          revision: 1n,
        }),
      });
    });

    it('loads, applies pause command, and saves', async () => {
      mockPrisma.playbackSession.upsert.mockResolvedValue({
        ...mockSession,
        state: 'playing',
        currentTrackId: 'track-1',
      });
      mockPrisma.playbackSession.update.mockResolvedValue({});

      const result = await service.executeCommand('user-1', { type: 'pause' });

      expect(result.state).toBe('paused');
      expect(result.revision).toBe(1n);
    });
  });
});

import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LibraryService } from '../library.service';

const mockPrisma = {
  like: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  track: {
    findUnique: vi.fn(),
  },
  playlist: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  playlistTrack: {
    findFirst: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
};

describe('LibraryService', () => {
  let service: LibraryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LibraryService(mockPrisma as any);
  });

  describe('listTracks', () => {
    it('returns paginated structure with cursor', async () => {
      const now = new Date();
      const likes = [
        {
          id: 'like-1',
          userId: 'user-1',
          trackId: 'track-1',
          createdAt: now,
          track: { id: 'track-1', canonicalTitle: 'Song A', canonicalArtist: 'Artist A' },
        },
        {
          id: 'like-2',
          userId: 'user-1',
          trackId: 'track-2',
          createdAt: now,
          track: { id: 'track-2', canonicalTitle: 'Song B', canonicalArtist: 'Artist B' },
        },
      ];
      mockPrisma.like.findMany.mockResolvedValue(likes);

      const result = await service.listTracks('user-1');

      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual(likes[0]!.track);
      expect(result.items[1]).toEqual(likes[1]!.track);
      expect(result.hasMore).toBe(false);
      expect(result.cursor).toBeNull();
    });

    it('returns hasMore true when more items exist', async () => {
      const now = new Date();
      const likes = Array.from({ length: 3 }, (_, i) => ({
        id: `like-${i}`,
        userId: 'user-1',
        trackId: `track-${i}`,
        createdAt: now,
        track: { id: `track-${i}`, canonicalTitle: `Song ${i}` },
      }));
      mockPrisma.like.findMany.mockResolvedValue(likes);

      const result = await service.listTracks('user-1', undefined, 2);

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.cursor).not.toBeNull();
    });
  });

  describe('createPlaylist', () => {
    it('creates record with correct data', async () => {
      const playlist = {
        id: 'playlist-1',
        userId: 'user-1',
        title: 'My Playlist',
        description: 'A description',
        trackCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.playlist.create.mockResolvedValue(playlist);

      const result = await service.createPlaylist('user-1', 'My Playlist', 'A description');

      expect(mockPrisma.playlist.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', title: 'My Playlist', description: 'A description' },
      });
      expect(result).toEqual(playlist);
    });
  });

  describe('addLike', () => {
    it('creates like record via upsert', async () => {
      const like = {
        id: 'like-1',
        userId: 'user-1',
        trackId: 'track-1',
        createdAt: new Date(),
      };
      mockPrisma.like.upsert.mockResolvedValue(like);

      const result = await service.addLike('user-1', 'track-1');

      expect(mockPrisma.like.upsert).toHaveBeenCalledWith({
        where: { userId_trackId: { userId: 'user-1', trackId: 'track-1' } },
        create: { userId: 'user-1', trackId: 'track-1' },
        update: {},
      });
      expect(result).toEqual(like);
    });
  });

  describe('removeLike', () => {
    it('deletes like record', async () => {
      mockPrisma.like.delete.mockResolvedValue({});

      await service.removeLike('user-1', 'track-1');

      expect(mockPrisma.like.delete).toHaveBeenCalledWith({
        where: { userId_trackId: { userId: 'user-1', trackId: 'track-1' } },
      });
    });
  });

  describe('addTrackToPlaylist', () => {
    it('creates PlaylistTrack and increments count', async () => {
      mockPrisma.playlist.findFirst.mockResolvedValue({
        id: 'playlist-1',
        userId: 'user-1',
        trackCount: 2,
      });
      mockPrisma.playlistTrack.findFirst.mockResolvedValue({ position: 4 });
      mockPrisma.playlistTrack.create.mockResolvedValue({});
      mockPrisma.playlist.update.mockResolvedValue({});

      await service.addTrackToPlaylist('user-1', 'playlist-1', 'track-1');

      expect(mockPrisma.playlistTrack.create).toHaveBeenCalledWith({
        data: { playlistId: 'playlist-1', trackId: 'track-1', position: 5 },
      });
      expect(mockPrisma.playlist.update).toHaveBeenCalledWith({
        where: { id: 'playlist-1' },
        data: { trackCount: { increment: 1 } },
      });
    });

    it('throws NotFoundException if playlist not owned by user', async () => {
      mockPrisma.playlist.findFirst.mockResolvedValue(null);

      await expect(service.addTrackToPlaylist('user-1', 'playlist-1', 'track-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listPlaylists', () => {
    it("returns user's playlists ordered by updatedAt desc", async () => {
      const playlists = [
        { id: 'p1', userId: 'user-1', title: 'Playlist 1', updatedAt: new Date() },
        { id: 'p2', userId: 'user-1', title: 'Playlist 2', updatedAt: new Date() },
      ];
      mockPrisma.playlist.findMany.mockResolvedValue(playlists);

      const result = await service.listPlaylists('user-1');

      expect(mockPrisma.playlist.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { updatedAt: 'desc' },
      });
      expect(result).toEqual(playlists);
    });
  });

  describe('getTrack', () => {
    it('throws NotFoundException if track does not exist', async () => {
      mockPrisma.track.findUnique.mockResolvedValue(null);

      await expect(service.getTrack('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});

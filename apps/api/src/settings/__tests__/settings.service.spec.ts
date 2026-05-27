import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsService } from '../settings.service';

const mockPrisma = {
  privacySetting: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
};

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SettingsService(mockPrisma as any);
  });

  describe('getSettings', () => {
    it('returns all settings as key-value map', async () => {
      mockPrisma.privacySetting.findMany.mockResolvedValue([
        { id: '1', userId: 'user-1', key: 'theme', value: 'dark' },
        { id: '2', userId: 'user-1', key: 'density', value: 'compact' },
      ]);

      const result = await service.getSettings('user-1');

      expect(mockPrisma.privacySetting.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(result).toEqual({ theme: 'dark', density: 'compact' });
    });

    it('returns empty map when user has no settings', async () => {
      mockPrisma.privacySetting.findMany.mockResolvedValue([]);

      const result = await service.getSettings('user-1');

      expect(result).toEqual({});
    });
  });

  describe('updateSettings', () => {
    it('upserts each key-value pair', async () => {
      mockPrisma.privacySetting.upsert.mockResolvedValue({});
      mockPrisma.privacySetting.findMany.mockResolvedValue([
        { id: '1', userId: 'user-1', key: 'theme', value: 'light' },
        { id: '2', userId: 'user-1', key: 'density', value: 'comfortable' },
      ]);

      const result = await service.updateSettings('user-1', {
        theme: 'light',
        density: 'comfortable',
      });

      expect(mockPrisma.privacySetting.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrisma.privacySetting.upsert).toHaveBeenCalledWith({
        where: { userId_key: { userId: 'user-1', key: 'theme' } },
        create: { userId: 'user-1', key: 'theme', value: 'light' },
        update: { value: 'light' },
      });
      expect(mockPrisma.privacySetting.upsert).toHaveBeenCalledWith({
        where: { userId_key: { userId: 'user-1', key: 'density' } },
        create: { userId: 'user-1', key: 'density', value: 'comfortable' },
        update: { value: 'comfortable' },
      });
      expect(result).toEqual({ theme: 'light', density: 'comfortable' });
    });
  });

  describe('getPrivacy', () => {
    it('returns only settings with privacy. prefix', async () => {
      mockPrisma.privacySetting.findMany.mockResolvedValue([
        { id: '1', userId: 'user-1', key: 'privacy.profile', value: 'public' },
        { id: '2', userId: 'user-1', key: 'privacy.listening', value: 'friends' },
      ]);

      const result = await service.getPrivacy('user-1');

      expect(mockPrisma.privacySetting.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          key: { startsWith: 'privacy.' },
        },
      });
      expect(result).toEqual({
        'privacy.profile': 'public',
        'privacy.listening': 'friends',
      });
    });
  });

  describe('updatePrivacy', () => {
    it('prefixes keys with privacy. if not already prefixed', async () => {
      mockPrisma.privacySetting.upsert.mockResolvedValue({});
      mockPrisma.privacySetting.findMany.mockResolvedValue([
        { id: '1', userId: 'user-1', key: 'privacy.profile', value: 'private' },
      ]);

      await service.updatePrivacy('user-1', { profile: 'private' });

      expect(mockPrisma.privacySetting.upsert).toHaveBeenCalledWith({
        where: { userId_key: { userId: 'user-1', key: 'privacy.profile' } },
        create: { userId: 'user-1', key: 'privacy.profile', value: 'private' },
        update: { value: 'private' },
      });
    });

    it('does not double-prefix keys that already have privacy. prefix', async () => {
      mockPrisma.privacySetting.upsert.mockResolvedValue({});
      mockPrisma.privacySetting.findMany.mockResolvedValue([
        { id: '1', userId: 'user-1', key: 'privacy.listening', value: 'none' },
      ]);

      await service.updatePrivacy('user-1', { 'privacy.listening': 'none' });

      expect(mockPrisma.privacySetting.upsert).toHaveBeenCalledWith({
        where: { userId_key: { userId: 'user-1', key: 'privacy.listening' } },
        create: { userId: 'user-1', key: 'privacy.listening', value: 'none' },
        update: { value: 'none' },
      });
    });
  });
});

import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { ConnectorId, ConnectorManifest, MusicConnector } from '@open-music/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConnectorRegistryService } from '../../connectors/connector-registry.service';
import { IntegrationsService } from '../integrations.service';

function createMockConnector(id: string): MusicConnector {
  const manifest: ConnectorManifest = {
    id: id as ConnectorId,
    name: `${id} connector`,
    description: `${id} description`,
    icon: `${id}.svg`,
    authMethod: 'oauth2',
    capabilities: { directPlayback: false, isrcAvailable: true, lyrics: false },
    rateLimits: { requestsPerMinute: 60 },
  };

  return {
    manifest,
    startAuth: vi.fn().mockResolvedValue({
      redirectUrl: `https://${id}.example.com/auth`,
      state: `state-${id}`,
    }),
    handleCallback: vi.fn().mockResolvedValue({
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-456',
      expiresAt: new Date('2025-12-31'),
      scope: 'read',
    }),
    refresh: vi.fn(),
    revoke: vi.fn().mockResolvedValue(undefined),
    listPlaylists: vi.fn(),
    listLikedTracks: vi.fn(),
    listRecentlyPlayed: vi.fn(),
    getTrack: vi.fn(),
    getDeepLink: vi.fn(),
  };
}

const mockPrisma = {
  connectedService: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
};

const mockRedis = {
  set: vi.fn().mockResolvedValue('OK'),
  get: vi.fn(),
  del: vi.fn().mockResolvedValue(1),
};

const mockTokenVault = {
  wrapAccessToken: vi.fn().mockResolvedValue(undefined),
  wrapRefreshToken: vi.fn().mockResolvedValue(undefined),
  unwrapAccessToken: vi.fn().mockResolvedValue('access-token-123'),
  unwrapRefreshToken: vi.fn().mockResolvedValue('refresh-token-456'),
};

const mockAudit = {
  log: vi.fn().mockResolvedValue(undefined),
};

describe('IntegrationsService', () => {
  let service: IntegrationsService;
  let registry: ConnectorRegistryService;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new ConnectorRegistryService();
    service = new IntegrationsService(
      registry,
      mockPrisma as any,
      mockRedis as any,
      mockTokenVault as any,
      mockAudit as any,
    );
  });

  describe('listConnectors', () => {
    it('returns manifests from registry', () => {
      const connector = createMockConnector('yandex_music');
      registry.register(connector);

      const result = service.listConnectors();
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('yandex_music');
    });
  });

  describe('listConnections', () => {
    it('returns user connections from prisma', async () => {
      const connections = [{ id: 'conn-1', userId: 'user-1', connectorId: 'yandex_music' }];
      mockPrisma.connectedService.findMany.mockResolvedValue(connections);

      const result = await service.listConnections('user-1');
      expect(result).toEqual(connections);
      expect(mockPrisma.connectedService.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });

  describe('connect', () => {
    it('stores state in Redis and returns redirectUrl', async () => {
      const connector = createMockConnector('yandex_music');
      registry.register(connector);

      const result = await service.connect('user-1', 'yandex_music');

      expect(result.redirectUrl).toBe('https://yandex_music.example.com/auth');
      expect(result.state).toBe('state-yandex_music');
      expect(mockRedis.set).toHaveBeenCalledWith(
        'oauth_state:state-yandex_music',
        JSON.stringify({ userId: 'user-1', connectorId: 'yandex_music' }),
        'EX',
        600,
      );
    });

    it('throws NotFoundException for unknown connector', async () => {
      await expect(service.connect('user-1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('handleCallback', () => {
    it('validates state, creates ConnectedService, and wraps tokens', async () => {
      const connector = createMockConnector('yandex_music');
      registry.register(connector);

      mockRedis.get.mockResolvedValue(
        JSON.stringify({ userId: 'user-1', connectorId: 'yandex_music' }),
      );
      mockPrisma.connectedService.create.mockResolvedValue({
        id: 'cs-1',
        userId: 'user-1',
        connectorId: 'yandex_music',
        status: 'connected',
      });

      const result = await service.handleCallback('state-yandex_music', { code: 'auth-code' });

      expect(result.id).toBe('cs-1');
      expect(mockRedis.del).toHaveBeenCalledWith('oauth_state:state-yandex_music');
      expect(mockTokenVault.wrapAccessToken).toHaveBeenCalledWith('cs-1', 'access-token-123');
      expect(mockTokenVault.wrapRefreshToken).toHaveBeenCalledWith('cs-1', 'refresh-token-456');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'connector_connected',
          category: 'integration',
          userId: 'user-1',
        }),
      );
    });

    it('throws BadRequestException for invalid state', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(service.handleCallback('invalid-state', {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('disconnect', () => {
    it('verifies ownership and deletes connection', async () => {
      const connector = createMockConnector('yandex_music');
      registry.register(connector);

      mockPrisma.connectedService.findUnique.mockResolvedValue({
        id: 'conn-1',
        userId: 'user-1',
        connectorId: 'yandex_music',
        accessTokenCt: Buffer.from('enc'),
        refreshTokenCt: Buffer.from('enc'),
        dekId: 'dek-1',
        tokenExpiresAt: new Date(),
      });
      mockPrisma.connectedService.delete.mockResolvedValue({});

      await service.disconnect('user-1', 'conn-1');

      expect(mockPrisma.connectedService.delete).toHaveBeenCalledWith({
        where: { id: 'conn-1' },
      });
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'connector_disconnected',
          category: 'integration',
          userId: 'user-1',
        }),
      );
    });

    it('throws NotFoundException when connection belongs to another user', async () => {
      mockPrisma.connectedService.findUnique.mockResolvedValue({
        id: 'conn-1',
        userId: 'other-user',
        connectorId: 'yandex_music',
      });

      await expect(service.disconnect('user-1', 'conn-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when connection does not exist', async () => {
      mockPrisma.connectedService.findUnique.mockResolvedValue(null);

      await expect(service.disconnect('user-1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getConnection', () => {
    it('returns connection when owned by user', async () => {
      const connection = { id: 'conn-1', userId: 'user-1', connectorId: 'yandex_music' };
      mockPrisma.connectedService.findUnique.mockResolvedValue(connection);

      const result = await service.getConnection('user-1', 'conn-1');
      expect(result).toEqual(connection);
    });

    it('throws NotFoundException when not owned by user', async () => {
      mockPrisma.connectedService.findUnique.mockResolvedValue({
        id: 'conn-1',
        userId: 'other-user',
      });

      await expect(service.getConnection('user-1', 'conn-1')).rejects.toThrow(NotFoundException);
    });
  });
});

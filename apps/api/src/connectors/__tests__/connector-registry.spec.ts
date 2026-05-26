import type { ConnectorId, ConnectorManifest, MusicConnector } from '@open-music/shared';
import { beforeEach, describe, expect, it } from 'vitest';

import { ConnectorRegistryService } from '../connector-registry.service';

function createMockConnector(id: string, name: string): MusicConnector {
  const manifest: ConnectorManifest = {
    id: id as ConnectorId,
    name,
    description: `${name} connector`,
    icon: `${id}.svg`,
    authMethod: 'oauth2',
    capabilities: { directPlayback: false, isrcAvailable: true, lyrics: false },
    rateLimits: { requestsPerMinute: 60 },
  };

  return {
    manifest,
    startAuth: async () => ({ redirectUrl: 'https://example.com/auth', state: 'test-state' }),
    handleCallback: async () => ({
      accessToken: 'at',
      refreshToken: 'rt',
      expiresAt: new Date(),
      scope: null,
    }),
    refresh: async (t) => t,
    revoke: async () => {},
    listPlaylists: async () => ({ items: [], cursor: null, hasMore: false, total: 0 }),
    listLikedTracks: async () => ({ items: [], cursor: null, hasMore: false, total: 0 }),
    listRecentlyPlayed: async () => ({ items: [], cursor: null, hasMore: false, total: 0 }),
    getTrack: async () => null,
    getDeepLink: () => '',
  };
}

describe('ConnectorRegistryService', () => {
  let service: ConnectorRegistryService;

  beforeEach(() => {
    service = new ConnectorRegistryService();
  });

  describe('register', () => {
    it('adds a connector to the registry', () => {
      const connector = createMockConnector('yandex_music', 'Yandex Music');
      service.register(connector);

      expect(service.has('yandex_music' as ConnectorId)).toBe(true);
    });
  });

  describe('get', () => {
    it('retrieves a registered connector by id', () => {
      const connector = createMockConnector('youtube_music', 'YouTube Music');
      service.register(connector);

      const result = service.get('youtube_music' as ConnectorId);
      expect(result).toBe(connector);
    });

    it('returns undefined for unregistered connector', () => {
      const result = service.get('nonexistent' as ConnectorId);
      expect(result).toBeUndefined();
    });
  });

  describe('list', () => {
    it('returns manifests of all registered connectors', () => {
      const c1 = createMockConnector('yandex_music', 'Yandex Music');
      const c2 = createMockConnector('youtube_music', 'YouTube Music');
      service.register(c1);
      service.register(c2);

      const manifests = service.list();
      expect(manifests).toHaveLength(2);
      expect(manifests[0]!.id).toBe('yandex_music');
      expect(manifests[1]!.id).toBe('youtube_music');
    });

    it('returns empty array when no connectors are registered', () => {
      expect(service.list()).toEqual([]);
    });
  });

  describe('has', () => {
    it('returns true for registered connector', () => {
      const connector = createMockConnector('file_import', 'File Import');
      service.register(connector);

      expect(service.has('file_import' as ConnectorId)).toBe(true);
    });

    it('returns false for unregistered connector', () => {
      expect(service.has('unknown' as ConnectorId)).toBe(false);
    });
  });
});

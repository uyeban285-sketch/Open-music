import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KmsService } from '../../kms/kms.service';
import { TokenVaultService } from '../token-vault.service';

const mockPrisma = {
  connectedService: {
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
  },
};

const mockAudit = {
  log: vi.fn(),
};

describe('TokenVaultService', () => {
  let service: TokenVaultService;
  let kms: KmsService;

  beforeEach(() => {
    vi.clearAllMocks();
    kms = new KmsService();
    service = new TokenVaultService(kms, mockPrisma as any, mockAudit as any);
  });

  describe('wrapAccessToken', () => {
    it('encrypts and stores ciphertext + dekId', async () => {
      mockPrisma.connectedService.update.mockResolvedValue({});

      await service.wrapAccessToken('cs-1', 'my-secret-token');

      expect(mockPrisma.connectedService.update).toHaveBeenCalledWith({
        where: { id: 'cs-1' },
        data: {
          accessTokenCt: expect.any(Buffer),
          dekId: expect.any(String),
        },
      });

      const call = mockPrisma.connectedService.update.mock.calls[0]![0] as {
        data: { accessTokenCt: Buffer; dekId: string };
      };
      expect(call.data.accessTokenCt.length).toBeGreaterThan(0);
      expect(call.data.dekId).toBeTruthy();
    });
  });

  describe('wrapRefreshToken', () => {
    it('encrypts and stores ciphertext + dekId for refresh token', async () => {
      mockPrisma.connectedService.update.mockResolvedValue({});

      await service.wrapRefreshToken('cs-1', 'my-refresh-token');

      expect(mockPrisma.connectedService.update).toHaveBeenCalledWith({
        where: { id: 'cs-1' },
        data: {
          refreshTokenCt: expect.any(Buffer),
          dekId: expect.any(String),
        },
      });
    });
  });

  describe('unwrapAccessToken', () => {
    it('returns original plaintext (round-trip)', async () => {
      const plainToken = 'my-secret-access-token';
      let storedCt: Buffer | null = null;
      let storedDekId: string | null = null;

      mockPrisma.connectedService.update.mockImplementation(async ({ data }) => {
        storedCt = data.accessTokenCt;
        storedDekId = data.dekId;
        return {};
      });

      await service.wrapAccessToken('cs-1', plainToken);

      mockPrisma.connectedService.findUniqueOrThrow.mockResolvedValue({
        id: 'cs-1',
        accessTokenCt: storedCt,
        dekId: storedDekId,
      });
      mockAudit.log.mockResolvedValue(undefined);

      const result = await service.unwrapAccessToken('cs-1', 'user-1');

      expect(result).toBe(plainToken);
    });

    it('logs audit event on unwrap', async () => {
      const plainToken = 'token-to-audit';
      let storedCt: Buffer | null = null;
      let storedDekId: string | null = null;

      mockPrisma.connectedService.update.mockImplementation(async ({ data }) => {
        storedCt = data.accessTokenCt;
        storedDekId = data.dekId;
        return {};
      });

      await service.wrapAccessToken('cs-1', plainToken);

      mockPrisma.connectedService.findUniqueOrThrow.mockResolvedValue({
        id: 'cs-1',
        accessTokenCt: storedCt,
        dekId: storedDekId,
      });
      mockAudit.log.mockResolvedValue(undefined);

      await service.unwrapAccessToken('cs-1', 'user-1');

      expect(mockAudit.log).toHaveBeenCalledWith({
        action: 'token_unwrap',
        category: 'security',
        userId: 'user-1',
        metadata: { connectedServiceId: 'cs-1', tokenType: 'access' },
      });
    });

    it('throws when ciphertext is null', async () => {
      mockPrisma.connectedService.findUniqueOrThrow.mockResolvedValue({
        id: 'cs-1',
        accessTokenCt: null,
        dekId: null,
      });

      await expect(service.unwrapAccessToken('cs-1', 'user-1')).rejects.toThrow(
        'Access token ciphertext or DEK ID is missing',
      );
    });
  });

  describe('unwrapRefreshToken', () => {
    it('returns original plaintext (round-trip)', async () => {
      const plainToken = 'my-secret-refresh-token';
      let storedCt: Buffer | null = null;
      let storedDekId: string | null = null;

      mockPrisma.connectedService.update.mockImplementation(async ({ data }) => {
        storedCt = data.refreshTokenCt;
        storedDekId = data.dekId;
        return {};
      });

      await service.wrapRefreshToken('cs-1', plainToken);

      mockPrisma.connectedService.findUniqueOrThrow.mockResolvedValue({
        id: 'cs-1',
        refreshTokenCt: storedCt,
        dekId: storedDekId,
      });
      mockAudit.log.mockResolvedValue(undefined);

      const result = await service.unwrapRefreshToken('cs-1', 'user-1');

      expect(result).toBe(plainToken);
    });

    it('throws when refresh token ciphertext is null', async () => {
      mockPrisma.connectedService.findUniqueOrThrow.mockResolvedValue({
        id: 'cs-1',
        refreshTokenCt: null,
        dekId: 'some-dek',
      });

      await expect(service.unwrapRefreshToken('cs-1', 'user-1')).rejects.toThrow(
        'Refresh token ciphertext or DEK ID is missing',
      );
    });
  });
});

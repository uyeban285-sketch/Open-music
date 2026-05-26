import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../auth.service';

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
};

const mockJwt = {
  sign: vi.fn().mockReturnValue('mock-access-token'),
};

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService(mockPrisma as any, mockJwt as any, mockRedis as any);
  });

  describe('register', () => {
    it('creates user with argon2id hash that verifies correctly', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockImplementation(async ({ data }) => ({
        id: 'user-1',
        email: data.email,
        displayName: data.displayName,
        passwordHash: data.passwordHash,
        role: 'USER',
      }));
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.register('test@example.com', 'password123', 'Test User');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');

      // Verify argon2id hash was created correctly
      const createCall = mockPrisma.user.create.mock.calls[0]![0] as {
        data: { passwordHash: string };
      };
      const hash = createCall.data.passwordHash;
      expect(hash).toContain('$argon2id$');
      const valid = await argon2.verify(hash, 'password123');
      expect(valid).toBe(true);
    });

    it('throws ConflictException when user already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing', email: 'test@example.com' });

      await expect(
        service.register('test@example.com', 'password123', 'Test User'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('returns tokens with correct password', async () => {
      const hash = await argon2.hash('password123', {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: hash,
        role: 'USER',
      });
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.login('test@example.com', 'password123');

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresIn).toBe(900);
      expect(mockJwt.sign).toHaveBeenCalledWith({ sub: 'user-1', role: 'USER' });
    });

    it('throws UnauthorizedException with wrong password', async () => {
      const hash = await argon2.hash('correct-password', {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: hash,
        role: 'USER',
      });

      await expect(service.login('test@example.com', 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login('nonexistent@example.com', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    it('returns new token pair and invalidates old token', async () => {
      mockRedis.get.mockResolvedValue('user-1');
      mockRedis.del.mockResolvedValue(1);
      mockRedis.set.mockResolvedValue('OK');
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER',
      });

      const result = await service.refresh('old-refresh-token');

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toBe('old-refresh-token');
      expect(mockRedis.del).toHaveBeenCalledWith('refresh:old-refresh-token');
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^refresh:/),
        'user-1',
        'EX',
        2592000,
      );
    });

    it('throws UnauthorizedException with invalid/expired token', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(service.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('removes refresh token from Redis', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.logout('some-refresh-token');

      expect(mockRedis.del).toHaveBeenCalledWith('refresh:some-refresh-token');
    });
  });
});

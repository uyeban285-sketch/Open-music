import { describe, expect, it } from 'vitest';

import { JwtAuthGuard } from '../guards/jwt.guard';
import { JwtStrategy } from '../strategies/jwt.strategy';

describe('JwtStrategy', () => {
  describe('validate', () => {
    it('returns userId and role from payload', () => {
      const mockConfig = {
        get: (key: string) => {
          if (key === 'JWT_SECRET') return 'test-secret';
          return undefined;
        },
      };

      const strategy = new JwtStrategy(mockConfig as any);
      const result = strategy.validate({ sub: 'user-123', role: 'ADMIN' });

      expect(result).toEqual({ userId: 'user-123', role: 'ADMIN' });
    });

    it('handles USER role correctly', () => {
      const mockConfig = {
        get: (key: string) => {
          if (key === 'JWT_SECRET') return 'test-secret';
          return undefined;
        },
      };

      const strategy = new JwtStrategy(mockConfig as any);
      const result = strategy.validate({ sub: 'user-456', role: 'USER' });

      expect(result).toEqual({ userId: 'user-456', role: 'USER' });
    });
  });
});

describe('JwtAuthGuard', () => {
  it('extends AuthGuard with jwt strategy', () => {
    const guard = new JwtAuthGuard();
    expect(guard).toBeDefined();
    expect(guard).toBeInstanceOf(JwtAuthGuard);
  });
});

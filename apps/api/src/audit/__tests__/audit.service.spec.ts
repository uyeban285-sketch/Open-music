import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuditService } from '../audit.service';

const mockPrisma = {
  auditLog: {
    create: vi.fn(),
  },
};

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuditService(mockPrisma as any);
  });

  describe('log', () => {
    it('creates an AuditLog record with correct fields', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      await service.log({
        action: 'token_unwrap',
        category: 'security',
        userId: 'user-1',
        metadata: { connectedServiceId: 'cs-1', tokenType: 'access' },
        ipAddress: '127.0.0.1',
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'token_unwrap',
          category: 'security',
          userId: 'user-1',
          metadata: { connectedServiceId: 'cs-1', tokenType: 'access' },
          ipAddress: '127.0.0.1',
        },
      });
    });

    it('defaults metadata to empty object when not provided', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-2' });

      await service.log({
        action: 'user_login',
        category: 'auth',
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'user_login',
          category: 'auth',
          userId: undefined,
          metadata: {},
          ipAddress: undefined,
        },
      });
    });
  });
});

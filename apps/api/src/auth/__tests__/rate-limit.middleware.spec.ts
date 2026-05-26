import { HttpException, HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginRateLimitMiddleware } from '../middleware/rate-limit.middleware';

const mockMulti = {
  incr: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue([]),
};

const mockRedis = {
  get: vi.fn(),
  multi: vi.fn().mockReturnValue(mockMulti),
};

function createRequest(ip: string, email: string) {
  return {
    ip,
    socket: { remoteAddress: ip },
    body: { email },
  } as any;
}

const mockRes = {} as any;

describe('LoginRateLimitMiddleware', () => {
  let middleware: LoginRateLimitMiddleware;

  beforeEach(() => {
    vi.clearAllMocks();
    middleware = new LoginRateLimitMiddleware(mockRedis as any);
  });

  it('allows requests under the limit (attempts < 5)', async () => {
    mockRedis.get.mockResolvedValue('3');
    const next = vi.fn();

    await middleware.use(createRequest('127.0.0.1', 'user@example.com'), mockRes, next);

    expect(next).toHaveBeenCalled();
    expect(mockRedis.multi).toHaveBeenCalled();
    expect(mockMulti.incr).toHaveBeenCalledWith('rate_limit:login:127.0.0.1:user@example.com');
    expect(mockMulti.expire).toHaveBeenCalledWith(
      'rate_limit:login:127.0.0.1:user@example.com',
      900,
    );
  });

  it('allows requests when no previous attempts exist', async () => {
    mockRedis.get.mockResolvedValue(null);
    const next = vi.fn();

    await middleware.use(createRequest('127.0.0.1', 'user@example.com'), mockRes, next);

    expect(next).toHaveBeenCalled();
  });

  it('blocks after 5 attempts for same IP+email (throws 429)', async () => {
    mockRedis.get.mockResolvedValue('5');
    const next = vi.fn();

    await expect(
      middleware.use(createRequest('127.0.0.1', 'user@example.com'), mockRes, next),
    ).rejects.toThrow(HttpException);

    try {
      await middleware.use(createRequest('127.0.0.1', 'user@example.com'), mockRes, next);
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }

    expect(next).not.toHaveBeenCalled();
  });

  it('separate IP+email combos have separate counters', async () => {
    // First combo: at limit
    mockRedis.get.mockResolvedValueOnce('5');
    const next1 = vi.fn();

    await expect(
      middleware.use(createRequest('10.0.0.1', 'alice@example.com'), mockRes, next1),
    ).rejects.toThrow(HttpException);

    // Second combo: under limit
    mockRedis.get.mockResolvedValueOnce('2');
    const next2 = vi.fn();

    await middleware.use(createRequest('10.0.0.2', 'bob@example.com'), mockRes, next2);

    expect(next1).not.toHaveBeenCalled();
    expect(next2).toHaveBeenCalled();
  });

  it('uses incr + expire to track attempts', async () => {
    mockRedis.get.mockResolvedValue('1');
    const next = vi.fn();

    await middleware.use(createRequest('192.168.1.1', 'test@example.com'), mockRes, next);

    expect(mockRedis.multi).toHaveBeenCalled();
    expect(mockMulti.incr).toHaveBeenCalledWith('rate_limit:login:192.168.1.1:test@example.com');
    expect(mockMulti.expire).toHaveBeenCalledWith(
      'rate_limit:login:192.168.1.1:test@example.com',
      900,
    );
    expect(mockMulti.exec).toHaveBeenCalled();
  });
});

import { createHash } from 'crypto';

import { HttpException, HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginRateLimitMiddleware } from '../middleware/rate-limit.middleware';

const mockRedis = {
  incr: vi.fn(),
  expire: vi.fn(),
};

function hashEmail(email: string): string {
  return createHash('sha256').update(email).digest('hex').slice(0, 16);
}

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

  it('allows requests under the limit (attempts <= 5)', async () => {
    mockRedis.incr.mockResolvedValue(3);
    const next = vi.fn();

    await middleware.use(createRequest('127.0.0.1', 'user@example.com'), mockRes, next);

    expect(next).toHaveBeenCalled();
    expect(mockRedis.incr).toHaveBeenCalledWith(
      `rate_limit:login:127.0.0.1:${hashEmail('user@example.com')}`,
    );
    expect(mockRedis.expire).not.toHaveBeenCalled();
  });

  it('sets TTL on first attempt (incr returns 1)', async () => {
    mockRedis.incr.mockResolvedValue(1);
    const next = vi.fn();

    await middleware.use(createRequest('127.0.0.1', 'user@example.com'), mockRes, next);

    expect(next).toHaveBeenCalled();
    expect(mockRedis.expire).toHaveBeenCalledWith(
      `rate_limit:login:127.0.0.1:${hashEmail('user@example.com')}`,
      900,
    );
  });

  it('blocks after exceeding max attempts (throws 429)', async () => {
    mockRedis.incr.mockResolvedValue(6);
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

  it('allows exactly 5 attempts (boundary check)', async () => {
    mockRedis.incr.mockResolvedValue(5);
    const next = vi.fn();

    await middleware.use(createRequest('127.0.0.1', 'user@example.com'), mockRes, next);

    expect(next).toHaveBeenCalled();
  });

  it('separate IP+email combos have separate counters', async () => {
    // First combo: over limit
    mockRedis.incr.mockResolvedValueOnce(6);
    const next1 = vi.fn();

    await expect(
      middleware.use(createRequest('10.0.0.1', 'alice@example.com'), mockRes, next1),
    ).rejects.toThrow(HttpException);

    // Second combo: under limit
    mockRedis.incr.mockResolvedValueOnce(2);
    const next2 = vi.fn();

    await middleware.use(createRequest('10.0.0.2', 'bob@example.com'), mockRes, next2);

    expect(next1).not.toHaveBeenCalled();
    expect(next2).toHaveBeenCalled();
  });

  it('uses "invalid" for emails longer than 254 characters', async () => {
    mockRedis.incr.mockResolvedValue(1);
    const next = vi.fn();
    const longEmail = 'a'.repeat(255) + '@example.com';

    await middleware.use(createRequest('127.0.0.1', longEmail), mockRes, next);

    expect(mockRedis.incr).toHaveBeenCalledWith('rate_limit:login:127.0.0.1:invalid');
    expect(next).toHaveBeenCalled();
  });

  it('hashes the email component of the key', async () => {
    mockRedis.incr.mockResolvedValue(1);
    const next = vi.fn();

    await middleware.use(createRequest('192.168.1.1', 'test@domain.com'), mockRes, next);

    const expectedHash = hashEmail('test@domain.com');
    expect(mockRedis.incr).toHaveBeenCalledWith(`rate_limit:login:192.168.1.1:${expectedHash}`);
  });
});

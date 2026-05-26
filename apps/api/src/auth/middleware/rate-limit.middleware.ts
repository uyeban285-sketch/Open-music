import type { NestMiddleware } from '@nestjs/common';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { RedisService } from '../../redis/redis.service';

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60; // 15 minutes

@Injectable()
export class LoginRateLimitMiddleware implements NestMiddleware {
  constructor(@Inject(RedisService) private readonly redis: RedisService) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const email = (req.body as { email?: string })?.email ?? 'unknown';
    const key = `rate_limit:login:${ip}:${email}`;

    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, WINDOW_SECONDS);
    }

    if (current > MAX_ATTEMPTS) {
      throw new HttpException(
        {
          type: 'https://httpstatuses.com/429',
          title: 'Too Many Requests',
          status: 429,
          detail: 'Too many login attempts. Please try again later.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }
}

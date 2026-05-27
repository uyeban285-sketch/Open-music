import { Injectable } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { InjectPrisma } from '../../prisma/prisma.module.js';

type RawRequest = FastifyRequest['raw'] & { user?: { userId: string } };

@Injectable()
export class RlsMiddleware implements NestMiddleware {
  constructor(@InjectPrisma() private readonly prisma: PrismaClient) {}

  async use(req: RawRequest, _res: FastifyReply['raw'], next: () => void): Promise<void> {
    const userId = req.user?.userId;
    if (userId) {
      await this.prisma.$executeRawUnsafe(`SET LOCAL app.user_id = '${userId}'`);
    }
    next();
  }
}

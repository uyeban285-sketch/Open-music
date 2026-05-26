import type { NestMiddleware } from '@nestjs/common';
import { Inject, Injectable } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { PrismaService } from '../../prisma/prisma.service';

interface RequestWithUser extends Request {
  user?: { id: string };
}

@Injectable()
export class RlsMiddleware implements NestMiddleware {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async use(req: RequestWithUser, _res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;

    if (userId) {
      await this.prisma.$executeRawUnsafe(`SET LOCAL app.user_id = '${userId}'`);
    }

    next();
  }
}

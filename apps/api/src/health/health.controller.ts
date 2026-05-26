import { Controller, Get, Inject } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get('healthz')
  healthz(): { status: string; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('readyz')
  async readyz(): Promise<{ status: string; timestamp: string }> {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}

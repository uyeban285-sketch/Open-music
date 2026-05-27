import { Controller, Get } from '@nestjs/common';
import { HealthCheck } from '@nestjs/terminus';
import type { HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import type { PrismaClient } from '@prisma/client';

import { InjectPrisma } from '../prisma/prisma.module.js';

@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    @InjectPrisma() private readonly prisma: PrismaClient,
  ) {}

  @Get('healthz')
  liveness(): { status: string } {
    return { status: 'ok' };
  }

  @Get('readyz')
  @HealthCheck()
  readiness() {
    return this.health.check([() => this.prismaHealth.pingCheck('database', this.prisma)]);
  }
}

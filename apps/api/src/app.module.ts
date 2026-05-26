import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { LoginRateLimitMiddleware } from './auth/middleware/rate-limit.middleware';
import { envSchema } from './config/env.schema';
import { ConnectorsModule } from './connectors/connectors.module';
import { HealthModule } from './health/health.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { KmsModule } from './kms/kms.module';
import { MatchingModule } from './matching/matching.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { TokenVaultModule } from './token-vault/token-vault.module';

function validate(config: Record<string, unknown>): Record<string, unknown> {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Config validation error: ${result.error.message}`);
  }
  return result.data as unknown as Record<string, unknown>;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env['NODE_ENV'] !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
      },
    }),
    HealthModule,
    PrismaModule,
    RedisModule,
    KmsModule,
    AuditModule,
    AuthModule,
    TokenVaultModule,
    ConnectorsModule,
    IntegrationsModule,
    MatchingModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoginRateLimitMiddleware).forRoutes('auth/login');
  }
}

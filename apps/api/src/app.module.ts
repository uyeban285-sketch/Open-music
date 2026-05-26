import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import { envSchema } from './config/env.schema';
import { HealthModule } from './health/health.module';
import { KmsModule } from './kms/kms.module';
import { PrismaModule } from './prisma/prisma.module';

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
    KmsModule,
  ],
})
export class AppModule {}

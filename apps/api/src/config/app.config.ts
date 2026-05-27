import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  KMS_BACKEND: z.enum(['mock', 'localstack', 'aws', 'vault']).default('mock'),
  MOCK_KMS_URL: z.string().url().optional(),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export function validateConfig(config: Record<string, unknown>): AppEnv {
  const result = EnvSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Config validation failed:\n${result.error.toString()}`);
  }
  return result.data;
}

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  port: parseInt(process.env['API_PORT'] ?? '3000', 10),
  databaseUrl: process.env['DATABASE_URL'],
  redisUrl: process.env['REDIS_URL'],
  jwt: {
    accessSecret: process.env['JWT_ACCESS_SECRET'],
    refreshSecret: process.env['JWT_REFRESH_SECRET'],
    accessTtlSeconds: parseInt(process.env['JWT_ACCESS_TTL_SECONDS'] ?? '900', 10),
    refreshTtlDays: parseInt(process.env['JWT_REFRESH_TTL_DAYS'] ?? '30', 10),
  },
  kms: {
    backend: process.env['KMS_BACKEND'] ?? 'mock',
    mockUrl: process.env['MOCK_KMS_URL'] ?? 'http://localhost:2599',
  },
}));

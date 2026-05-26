import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api', { exclude: ['healthz', 'readyz'] });
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.enableShutdownHooks();

  const configService = app.get(ConfigService);
  const port = configService.get<number>('API_PORT', 3000);

  await app.listen(port);
}

void bootstrap();

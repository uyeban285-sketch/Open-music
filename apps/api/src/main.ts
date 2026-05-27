import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import { ProblemDetailsExceptionFilter } from './common/filters/problem-details.filter.js';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new ProblemDetailsExceptionFilter());
  app.setGlobalPrefix('api/v1');

  const port = process.env['API_PORT'] ? parseInt(process.env['API_PORT'], 10) : 3000;
  await app.listen(port, '0.0.0.0');
}

void bootstrap();

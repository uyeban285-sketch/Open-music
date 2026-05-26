import type { PipeTransform } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import type { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      throw new BadRequestException({
        type: 'https://httpstatuses.com/400',
        title: 'Validation Error',
        status: 400,
        detail: 'Request validation failed',
        errors,
      });
    }
    return result.data;
  }
}

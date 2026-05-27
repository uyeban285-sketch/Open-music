import { BadRequestException, Injectable } from '@nestjs/common';
import type { ArgumentMetadata, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const schema = metadata.metatype as unknown;
    if (!schema || !(schema instanceof ZodSchema)) {
      return value;
    }
    const result = schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(
        result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
      );
    }
    return result.data;
  }
}

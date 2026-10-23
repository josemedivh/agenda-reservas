import { BadRequestException, type PipeTransform } from '@nestjs/common';
import { z, type ZodType } from 'zod';

/** Validates and normalizes a request part with a zod schema (usually from @turnero/shared). */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Revisa los datos ingresados.',
        fieldErrors: z.flattenError(result.error).fieldErrors,
      });
    }
    return result.data;
  }
}

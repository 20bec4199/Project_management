import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { ZodSchema } from 'zod';

/**
 * A global validation pipe that uses nestjs-zod's metadata to validate
 * incoming request bodies/params/queries against their Zod schema.
 *
 * DTOs must be created with `createZodDto(schema)` from nestjs-zod so that
 * the schema is attached as static metadata on the class.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata) {
    // Only validate body/query/param — skip internal NestJS pipes
    if (!metadata.metatype) return value;

    const schema: ZodSchema | undefined = (
      metadata.metatype as { zodSchema?: ZodSchema }
    ).zodSchema;

    if (!schema) return value;

    const result = schema.safeParse(value);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new BadRequestException({ message: 'Validation failed', errors });
    }

    return result.data;
  }
}

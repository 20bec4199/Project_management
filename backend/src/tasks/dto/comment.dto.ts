import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateCommentSchema = z.object({
  body: z.string().min(1).max(5000),
});
export class CreateCommentDto extends createZodDto(CreateCommentSchema) {}

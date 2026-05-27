import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateLabelSchema = z.object({
  name: z.string().min(1).max(50),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex color e.g. #6366f1')
    .default('#6366f1'),
});
export class CreateLabelDto extends createZodDto(CreateLabelSchema) {}

const UpdateLabelSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex color e.g. #6366f1')
    .optional(),
});
export class UpdateLabelDto extends createZodDto(UpdateLabelSchema) {}

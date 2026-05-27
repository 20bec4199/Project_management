import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});
export class UpdateProfileDto extends createZodDto(UpdateProfileSchema) {}

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
});
export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) {}

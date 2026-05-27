import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ── Register ─────────────────────────────────────────────────────────────────

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
});

export class RegisterDto extends createZodDto(RegisterSchema) {}

// ── Login ────────────────────────────────────────────────────────────────────

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export class LoginDto extends createZodDto(LoginSchema) {}

// ── Refresh ──────────────────────────────────────────────────────────────────

const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export class RefreshDto extends createZodDto(RefreshSchema) {}

// ── Password reset ────────────────────────────────────────────────────────────

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});
export class ForgotPasswordDto extends createZodDto(ForgotPasswordSchema) {}

const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
});
export class ResetPasswordDto extends createZodDto(ResetPasswordSchema) {}

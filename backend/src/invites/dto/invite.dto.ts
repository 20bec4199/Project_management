import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { OrgRole } from '../../entities/org-member.entity';

// ── Create invite ─────────────────────────────────────────────────────────────

const CreateInviteSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(OrgRole).default(OrgRole.MEMBER),
});

export class CreateInviteDto extends createZodDto(CreateInviteSchema) {}

// ── Accept invite ─────────────────────────────────────────────────────────────

const AcceptInviteSchema = z.object({
  token: z.string().min(1),
});

export class AcceptInviteDto extends createZodDto(AcceptInviteSchema) {}

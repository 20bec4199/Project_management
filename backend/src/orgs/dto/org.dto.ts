import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { OrgPlan } from '../../entities/tenant.entity';

// ── Create Org ────────────────────────────────────────────────────────────────

const CreateOrgSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(
      /^[a-z0-9-]+$/,
      'Slug may only contain lowercase letters, numbers and hyphens',
    ),
  plan: z.nativeEnum(OrgPlan).optional(),
});

export class CreateOrgDto extends createZodDto(CreateOrgSchema) {}

// ── Update Org ────────────────────────────────────────────────────────────────

const UpdateOrgSchema = CreateOrgSchema.partial();
export class UpdateOrgDto extends createZodDto(UpdateOrgSchema) {}

// ── Update member role ────────────────────────────────────────────────────────

import { OrgRole } from '../../entities/org-member.entity';

const UpdateMemberRoleSchema = z.object({
  role: z.nativeEnum(OrgRole),
});
export class UpdateMemberRoleDto extends createZodDto(UpdateMemberRoleSchema) {}

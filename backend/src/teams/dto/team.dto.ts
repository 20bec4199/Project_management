import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ── Create / Update team ──────────────────────────────────────────────────────

const TeamSchema = z.object({
  name: z.string().min(1).max(100),
});

export class CreateTeamDto extends createZodDto(TeamSchema) {}
export class UpdateTeamDto extends createZodDto(TeamSchema.partial()) {}

// ── Add team member ───────────────────────────────────────────────────────────

const AddTeamMemberSchema = z.object({
  userId: z.string().uuid(),
});

export class AddTeamMemberDto extends createZodDto(AddTeamMemberSchema) {}

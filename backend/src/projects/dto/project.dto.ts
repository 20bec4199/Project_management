import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ProjectStatus } from '../../entities/project.entity';

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(120),
  status: z.nativeEnum(ProjectStatus).optional(),
});
export class CreateProjectDto extends createZodDto(CreateProjectSchema) {}

const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
});
export class UpdateProjectDto extends createZodDto(UpdateProjectSchema) {}

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { TaskPriority, TaskStatus } from '../../entities/task.entity';

// ── Create task ───────────────────────────────────────────────────────────────

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  projectId: z.string().uuid(),
  assigneeId: z.string().uuid().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z.coerce.date().optional(),
  labelIds: z.array(z.string().uuid()).optional(),
});
export class CreateTaskDto extends createZodDto(CreateTaskSchema) {}

// ── Update task ───────────────────────────────────────────────────────────────

const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  labelIds: z.array(z.string().uuid()).nullable().optional(),
});
export class UpdateTaskDto extends createZodDto(UpdateTaskSchema) {}

// ── Task query (cursor pagination + filters + sorting) ────────────────────────

const TaskQuerySchema = z.object({
  /** Opaque base64 cursor returned by the previous page. */
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),

  // Filters
  projectId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  labelId: z.string().uuid().optional(),

  // Sort
  sortBy: z
    .enum(['createdAt', 'dueDate', 'priority', 'status'])
    .default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),

  // Full-text search on title
  search: z.string().optional(),
});
export class TaskQueryDto extends createZodDto(TaskQuerySchema) {}

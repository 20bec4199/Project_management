import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Task, TaskStatus, TaskPriority } from '../entities/task.entity';
import { TaskActivity, ActivityAction } from '../entities/task-activity.entity';
import { Project } from '../entities/project.entity';
import { Label } from '../entities/label.entity';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from './dto/task.dto';
import { EventsGateway } from '../events/events.gateway';
import {
  NotificationsService,
} from '../notifications/notifications.service';
import { NotificationType } from '../entities/notification.entity';
import { RedisService } from '../redis/redis.service';

// ── Cursor helpers ────────────────────────────────────────────────────────────

interface Cursor {
  createdAt: string; // ISO string
  id: string;
}

function encodeCursor(task: Task): string {
  const payload: Cursor = {
    createdAt: task.createdAt.toISOString(),
    id: task.id,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeCursor(cursor: string): Cursor {
  try {
    return JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as Cursor;
  } catch {
    throw new BadRequestException('Invalid pagination cursor');
  }
}

// Priority enum → numeric for sorting
const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  [TaskPriority.URGENT]: 4,
  [TaskPriority.HIGH]: 3,
  [TaskPriority.MEDIUM]: 2,
  [TaskPriority.LOW]: 1,
};

const STATUS_WEIGHT: Record<TaskStatus, number> = {
  [TaskStatus.BACKLOG]: 0,
  [TaskStatus.TODO]: 1,
  [TaskStatus.IN_PROGRESS]: 2,
  [TaskStatus.IN_REVIEW]: 3,
  [TaskStatus.DONE]: 4,
};

export interface TaskPage {
  data: Task[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskActivity)
    private readonly activityRepo: Repository<TaskActivity>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Label)
    private readonly labelRepo: Repository<Label>,
    private readonly eventsGateway: EventsGateway,
    private readonly notificationsService: NotificationsService,
    private readonly redisService: RedisService,
  ) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async create(
    orgId: string,
    userId: string,
    dto: CreateTaskDto,
  ): Promise<Task> {
    // Validate project belongs to org
    const project = await this.projectRepo.findOne({
      where: { id: dto.projectId, orgId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const task = this.taskRepo.create({
      orgId,
      createdBy: userId,
      title: dto.title,
      description: dto.description ?? null,
      projectId: dto.projectId,
      assigneeId: dto.assigneeId ?? null,
      status: dto.status ?? TaskStatus.TODO,
      priority: dto.priority ?? TaskPriority.MEDIUM,
      dueDate: dto.dueDate ?? null,
    });

    if (dto.labelIds?.length) {
      task.labels = await this.labelRepo.findBy({ id: In(dto.labelIds), orgId });
    } else {
      task.labels = [];
    }

    await this.taskRepo.save(task);

    await this.logActivity(task.id, orgId, userId, ActivityAction.CREATED, {});

    // Invalidate project stats cache
    void this.redisService.invalidateCache(`org:${orgId}:project:${task.projectId}:stats`);

    // Real-time broadcast to the org room
    this.eventsGateway.emitTaskCreated(orgId, task);

    // Notify assignee if one was set
    if (task.assigneeId && task.assigneeId !== userId) {
      this.notificationsService
        .create({
          userId: task.assigneeId,
          orgId,
          type: NotificationType.TASK_ASSIGNED,
          payload: { taskId: task.id, title: task.title, assignedBy: userId },
        })
        .catch(() => {});
    }

    return task;
  }

  async findOne(orgId: string, taskId: string): Promise<Task> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId, orgId },
      relations: ['assignee', 'creator', 'labels'],
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async update(
    orgId: string,
    taskId: string,
    userId: string,
    dto: UpdateTaskDto,
  ): Promise<Task> {
    const task = await this.findOne(orgId, taskId);
    const activities: Promise<void>[] = [];

    if (dto.title !== undefined && dto.title !== task.title) {
      activities.push(
        this.logActivity(taskId, orgId, userId, ActivityAction.TITLE_CHANGED, {
          from: task.title,
          to: dto.title,
        }),
      );
    }
    if (dto.status !== undefined && dto.status !== task.status) {
      activities.push(
        this.logActivity(taskId, orgId, userId, ActivityAction.STATUS_CHANGED, {
          from: task.status,
          to: dto.status,
        }),
      );
    }
    if (dto.priority !== undefined && dto.priority !== task.priority) {
      activities.push(
        this.logActivity(
          taskId,
          orgId,
          userId,
          ActivityAction.PRIORITY_CHANGED,
          {
            from: task.priority,
            to: dto.priority,
          },
        ),
      );
    }
    if ('assigneeId' in dto) {
      if (dto.assigneeId && !task.assigneeId) {
        activities.push(
          this.logActivity(taskId, orgId, userId, ActivityAction.ASSIGNED, {
            assigneeId: dto.assigneeId,
          }),
        );
      } else if (!dto.assigneeId && task.assigneeId) {
        activities.push(
          this.logActivity(taskId, orgId, userId, ActivityAction.UNASSIGNED, {
            previousAssigneeId: task.assigneeId,
          }),
        );
      }
    }
    if ('dueDate' in dto && dto.dueDate !== task.dueDate) {
      activities.push(
        this.logActivity(
          taskId,
          orgId,
          userId,
          ActivityAction.DUE_DATE_CHANGED,
          {
            from: task.dueDate?.toISOString() ?? null,
            to: dto.dueDate?.toISOString() ?? null,
          },
        ),
      );
    }

    // Extract labelIds before assigning to task to avoid TypeORM confusion
    const { labelIds, ...taskFields } = dto;
    Object.assign(task, taskFields);

    if (labelIds !== undefined) {
      task.labels = labelIds?.length
        ? await this.labelRepo.findBy({ id: In(labelIds), orgId })
        : [];
    }

    const saved = await this.taskRepo.save(task);
    await Promise.all(activities);

    // Invalidate project stats cache
    void this.redisService.invalidateCache(`org:${orgId}:project:${saved.projectId}:stats`);

    // Real-time broadcast
    this.eventsGateway.emitTaskUpdated(orgId, saved);

    // Notify new assignee if assigneeId changed
    if (
      'assigneeId' in dto &&
      dto.assigneeId &&
      dto.assigneeId !== task.assigneeId
    ) {
      this.notificationsService
        .create({
          userId: dto.assigneeId,
          orgId,
          type: NotificationType.TASK_ASSIGNED,
          payload: { taskId: saved.id, title: saved.title, assignedBy: userId },
        })
        .catch(() => {});
    } else if (saved.assigneeId && saved.assigneeId !== userId) {
      // Notify existing assignee of the update
      this.notificationsService
        .create({
          userId: saved.assigneeId,
          orgId,
          type: NotificationType.TASK_UPDATED,
          payload: { taskId: saved.id, title: saved.title, updatedBy: userId },
        })
        .catch(() => {});
    }

    return saved;
  }

  async remove(orgId: string, taskId: string): Promise<void> {
    const task = await this.findOne(orgId, taskId);
    await this.taskRepo.remove(task);
    // Invalidate project stats cache
    void this.redisService.invalidateCache(`org:${orgId}:project:${task.projectId}:stats`);
    // Real-time broadcast
    this.eventsGateway.emitTaskDeleted(orgId, taskId);
  }

  // ── Cursor-based paginated listing ────────────────────────────────────────

  async findPaginated(orgId: string, query: TaskQueryDto): Promise<TaskPage> {
    const {
      cursor,
      limit = 20,
      projectId,
      assigneeId,
      status,
      priority,
      search,
      sortBy = 'createdAt',
      sortDir = 'desc',
      labelId,
    } = query;
    console.log({ query });

    const qb = this.taskRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.assignee', 'assignee')
      .leftJoinAndSelect('t.creator', 'creator')
      .leftJoinAndSelect('t.labels', 'labels')
      .where('t.orgId = :orgId', { orgId });

    // Filters
    if (projectId) qb.andWhere('t.projectId = :projectId', { projectId });

    if (assigneeId) qb.andWhere('t.assigneeId = :assigneeId', { assigneeId });

    if (status) qb.andWhere('t.status = :status', { status });

    if (priority) qb.andWhere('t.priority = :priority', { priority });

    if (search)
      qb.andWhere('t.title ILIKE :search', {
        search: `%${search}%`,
      });

    if (labelId) {
      qb.innerJoin('t.labels', 'filterLabel', 'filterLabel.id = :labelId', { labelId });
    }

    const dir = sortDir.toUpperCase() as 'ASC' | 'DESC';
    const oppDir = dir === 'DESC' ? 'ASC' : 'DESC';

    if (sortBy === 'createdAt') {
      qb.orderBy('t.createdAt', dir).addOrderBy('t.id', dir);
    } else if (sortBy === 'dueDate') {
      qb.orderBy('(CASE WHEN t.dueDate IS NULL THEN 1 ELSE 0 END)', 'ASC')
        .addOrderBy('t.dueDate', dir)
        .addOrderBy('t.createdAt', dir)
        .addOrderBy('t.id', dir);
    } else if (sortBy === 'priority') {
      qb.orderBy(
        `(CASE
      WHEN t.priority = 'urgent' THEN 4
      WHEN t.priority = 'high' THEN 3
      WHEN t.priority = 'medium' THEN 2
      WHEN t.priority = 'low' THEN 1
      ELSE 0
    END)`,
        dir,
      )
        .addOrderBy('t.createdAt', oppDir)
        .addOrderBy('t.id', dir);
    } else if (sortBy === 'status') {
      qb.orderBy(
        `(CASE
      WHEN t.status = 'backlog' THEN 0
      WHEN t.status = 'todo' THEN 1
      WHEN t.status = 'in_progress' THEN 2
      WHEN t.status = 'in_review' THEN 3
      WHEN t.status = 'done' THEN 4
      ELSE 0
    END)`,
        dir,
      )
        .addOrderBy('t.createdAt', oppDir)
        .addOrderBy('t.id', dir);
    }

    // Cursor pagination
    if (cursor && sortBy === 'createdAt') {
      const decoded = decodeCursor(cursor);
      const op = dir === 'DESC' ? '<' : '>';

      qb.andWhere(
        `(t.createdAt ${op} :cursorDate
      OR
     (t.createdAt = :cursorDate AND t.id ${op} :cursorId))`,
        {
          cursorDate: decoded.createdAt,
          cursorId: decoded.id,
        },
      );
    }

    qb.take(limit + 1);

    const rows = await qb.getMany();
    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;
    const nextCursor =
      hasNextPage && sortBy === 'createdAt'
        ? encodeCursor(data[data.length - 1])
        : null;

    console.log(data);

    return { data, nextCursor, hasNextPage };
  }

  // ── Activity log ──────────────────────────────────────────────────────────

  async getActivity(orgId: string, taskId: string): Promise<TaskActivity[]> {
    await this.findOne(orgId, taskId); // 404 guard
    return this.activityRepo.find({
      where: { taskId, orgId },
      relations: ['actor'],
      order: { createdAt: 'ASC' },
    });
  }

  async logActivity(
    taskId: string,
    orgId: string,
    actorId: string,
    action: ActivityAction,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const entry = this.activityRepo.create({
      taskId,
      orgId,
      actorId,
      action,
      metadata,
    });
    await this.activityRepo.save(entry);
  }
}

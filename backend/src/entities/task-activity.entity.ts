import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Task } from './task.entity';
import { User } from './user.entity';
import { Tenant } from './tenant.entity';

export enum ActivityAction {
  CREATED = 'created',
  TITLE_CHANGED = 'title_changed',
  DESCRIPTION_CHANGED = 'description_changed',
  STATUS_CHANGED = 'status_changed',
  PRIORITY_CHANGED = 'priority_changed',
  ASSIGNED = 'assigned',
  UNASSIGNED = 'unassigned',
  DUE_DATE_CHANGED = 'due_date_changed',
  COMMENTED = 'commented',
}

/**
 * Append-only activity log. Rows are NEVER updated or deleted.
 * `metadata` holds contextual diff data, e.g. { from: 'todo', to: 'done' }.
 */
@Entity('task_activities')
export class TaskActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ name: 'actor_id', type: 'uuid' })
  actorId: string;

  @Column({ type: 'enum', enum: ActivityAction })
  action: ActivityAction;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_id' })
  org: Tenant;
}

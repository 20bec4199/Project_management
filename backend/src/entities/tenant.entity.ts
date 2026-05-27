import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrgMember } from './org-member.entity';
import { Project } from './project.entity';
import { Notification } from './notification.entity';

export enum OrgPlan {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', unique: true })
  slug: string;

  @Column({ type: 'enum', enum: OrgPlan, default: OrgPlan.FREE })
  plan: OrgPlan;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => OrgMember, (member) => member.org)
  members: OrgMember[];

  @OneToMany(() => Project, (project) => project.org)
  projects: Project[];

  @OneToMany(() => Notification, (notification) => notification.org)
  notifications: Notification[];
}

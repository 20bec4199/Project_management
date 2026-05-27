import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

export enum OrgRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

/** Numeric weight — higher = more privileged. Used by RolesGuard. */
export const ROLE_LEVEL: Record<OrgRole, number> = {
  [OrgRole.OWNER]: 4,
  [OrgRole.ADMIN]: 3,
  [OrgRole.MEMBER]: 2,
  [OrgRole.VIEWER]: 1,
};

@Entity('org_members')
export class OrgMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: OrgRole, default: OrgRole.MEMBER })
  role: OrgRole;

  @Column({ name: 'joined_at', type: 'timestamp', default: () => 'NOW()' })
  joinedAt: Date;

  @ManyToOne(() => Tenant, (tenant) => tenant.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_id' })
  org: Tenant;

  @ManyToOne(() => User, (user) => user.orgMemberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';
import { OrgRole } from './org-member.entity';

@Entity('org_invites')
export class OrgInvite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ name: 'invited_by', type: 'uuid' })
  invitedBy: string;

  @Column({ type: 'varchar' })
  email: string;

  @Column({ type: 'enum', enum: OrgRole, default: OrgRole.MEMBER })
  role: OrgRole;

  /** SHA-256 hex digest of the raw invite token. */
  @Column({ name: 'token_hash', type: 'varchar', unique: true })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_id' })
  org: Tenant;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invited_by' })
  inviter: User;
}

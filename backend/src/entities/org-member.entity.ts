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
  // ── Org management roles ──────────────────────────────────────────────────
  OWNER = 'owner',
  ADMIN = 'admin',

  // ── IT company job-title roles ────────────────────────────────────────────
  /** Chief Technical Officer – org-level technical authority */
  CTO = 'cto',
  /** Project / programme manager – manages projects and timelines */
  PROJECT_MANAGER = 'project_manager',
  /** Technical Lead – leads a development stream */
  TECH_LEAD = 'tech_lead',
  /** Scrum Master / Agile Coach */
  SCRUM_MASTER = 'scrum_master',
  /** Product Owner – owns the product backlog */
  PRODUCT_OWNER = 'product_owner',
  /** Senior Software Developer */
  SENIOR_DEVELOPER = 'senior_developer',
  /** Software Developer */
  DEVELOPER = 'developer',
  /** Quality Assurance / Test Engineer */
  QA_ENGINEER = 'qa_engineer',
  /** DevOps / Platform / Site-Reliability Engineer */
  DEVOPS_ENGINEER = 'devops_engineer',
  /** UI / UX Designer */
  DESIGNER = 'designer',
  /** Data Analyst / Business Intelligence Engineer */
  DATA_ANALYST = 'data_analyst',
  /** Security / Application-Security Engineer */
  SECURITY_ENGINEER = 'security_engineer',

  // ── Generic fallback roles ────────────────────────────────────────────────
  MEMBER = 'member',
  VIEWER = 'viewer',
}

/**
 * Numeric privilege weight — higher = more access.
 * IT job-title roles slot into the existing hierarchy so that existing
 * @Roles() guards continue to work without modification.
 *
 * Hierarchy (condensed):
 *   OWNER(100) > ADMIN(80) > CTO(70) > PROJECT_MANAGER/TECH_LEAD/SCRUM_MASTER/PRODUCT_OWNER(60)
 *   > SENIOR_DEVELOPER(40) > DEVELOPER/QA/DEVOPS/DESIGNER/DATA_ANALYST/SECURITY(30)
 *   > MEMBER(20) > VIEWER(10)
 */
export const ROLE_LEVEL: Record<OrgRole, number> = {
  [OrgRole.OWNER]: 100,
  [OrgRole.ADMIN]: 80,
  [OrgRole.CTO]: 70,
  [OrgRole.PROJECT_MANAGER]: 60,
  [OrgRole.TECH_LEAD]: 60,
  [OrgRole.SCRUM_MASTER]: 60,
  [OrgRole.PRODUCT_OWNER]: 60,
  [OrgRole.SENIOR_DEVELOPER]: 40,
  [OrgRole.DEVELOPER]: 30,
  [OrgRole.QA_ENGINEER]: 30,
  [OrgRole.DEVOPS_ENGINEER]: 30,
  [OrgRole.DESIGNER]: 30,
  [OrgRole.DATA_ANALYST]: 30,
  [OrgRole.SECURITY_ENGINEER]: 30,
  [OrgRole.MEMBER]: 20,
  [OrgRole.VIEWER]: 10,
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

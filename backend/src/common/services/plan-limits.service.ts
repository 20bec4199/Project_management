import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, OrgPlan } from '../../entities/tenant.entity';
import { OrgMember } from '../../entities/org-member.entity';
import { Project } from '../../entities/project.entity';

interface PlanLimits {
  maxMembers: number;
  maxProjects: number;
}

const LIMITS: Record<OrgPlan, PlanLimits> = {
  [OrgPlan.FREE]: { maxMembers: 5, maxProjects: 3 },
  [OrgPlan.PRO]: { maxMembers: 50, maxProjects: Infinity },
  [OrgPlan.ENTERPRISE]: { maxMembers: Infinity, maxProjects: Infinity },
};

@Injectable()
export class PlanLimitsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(OrgMember)
    private readonly memberRepo: Repository<OrgMember>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  async assertMemberLimit(orgId: string): Promise<void> {
    const org = await this.tenantRepo.findOneOrFail({ where: { id: orgId } });
    const { maxMembers } = LIMITS[org.plan] ?? LIMITS[OrgPlan.FREE];
    if (maxMembers === Infinity) return;

    const count = await this.memberRepo.count({ where: { orgId } });
    if (count >= maxMembers) {
      throw new ForbiddenException(
        `Your plan (${org.plan}) allows a maximum of ${maxMembers} members. Please upgrade to add more.`,
      );
    }
  }

  async assertProjectLimit(orgId: string): Promise<void> {
    const org = await this.tenantRepo.findOneOrFail({ where: { id: orgId } });
    const { maxProjects } = LIMITS[org.plan] ?? LIMITS[OrgPlan.FREE];
    if (maxProjects === Infinity) return;

    const count = await this.projectRepo.count({ where: { orgId } });
    if (count >= maxProjects) {
      throw new ForbiddenException(
        `Your plan (${org.plan}) allows a maximum of ${maxProjects} projects. Please upgrade to add more.`,
      );
    }
  }
}

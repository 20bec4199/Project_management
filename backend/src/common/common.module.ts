import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgMember } from '../entities/org-member.entity';
import { Tenant } from '../entities/tenant.entity';
import { Project } from '../entities/project.entity';
import { RolesGuard } from './guards/roles.guard';
import { PlanLimitsService } from './services/plan-limits.service';

/**
 * Global module that provides shared guards and services.
 * Importing this in AppModule makes RolesGuard and PlanLimitsService injectable everywhere.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([OrgMember, Tenant, Project])],
  providers: [RolesGuard, PlanLimitsService],
  exports: [RolesGuard, PlanLimitsService],
})
export class CommonModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Tenant } from '../entities/tenant.entity';
import { OrgMember } from '../entities/org-member.entity';

import { OrgsController } from './orgs.controller';
import { OrgsService } from './orgs.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, OrgMember])],

  controllers: [OrgsController],

  providers: [OrgsService],

  exports: [OrgsService, TypeOrmModule],
})
export class OrgsModule {}

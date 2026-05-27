import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { OrgMember } from '../entities/org-member.entity';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  imports: [TypeOrmModule.forFeature([Team, TeamMember, OrgMember])],
  controllers: [TeamsController],
  providers: [TeamsService],
})
export class TeamsModule {}

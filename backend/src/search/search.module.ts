import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../entities/task.entity';
import { Project } from '../entities/project.entity';
import { OrgMember } from '../entities/org-member.entity';
import { SearchController } from './search.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Task, Project, OrgMember])],
  controllers: [SearchController],
})
export class SearchModule {}

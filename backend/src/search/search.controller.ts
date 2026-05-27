import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ILike, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtAccessGuard } from '../auth/guards/jwt.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrgRole } from '../entities/org-member.entity';
import { Task } from '../entities/task.entity';
import { Project } from '../entities/project.entity';

@UseGuards(JwtAccessGuard, RolesGuard)
@Controller('orgs/:orgId/search')
export class SearchController {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  @Roles(OrgRole.VIEWER)
  @Get()
  async search(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query('q') q: string,
  ) {
    const term = (q ?? '').trim();
    if (term.length < 2) return { tasks: [], projects: [] };

    const pattern = `%${term}%`;

    const [tasks, projects] = await Promise.all([
      this.taskRepo.find({
        where: { orgId, title: ILike(pattern) },
        order: { createdAt: 'DESC' },
        take: 10,
      }),
      this.projectRepo.find({
        where: { orgId, name: ILike(pattern) },
        order: { name: 'ASC' },
        take: 10,
      }),
    ]);

    return { tasks, projects };
  }
}

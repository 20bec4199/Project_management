import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrgRole } from '../entities/org-member.entity';
import type { JwtPayload } from '../auth/auth.types';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

@UseGuards(JwtAccessGuard, RolesGuard)
@Controller('orgs/:orgId/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Roles(OrgRole.MEMBER)
  @Post()
  create(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.create(orgId, user.sub, dto);
  }

  @Roles(OrgRole.VIEWER)
  @Get()
  findAll(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.projectsService.findAll(orgId);
  }

  @Roles(OrgRole.VIEWER)
  @Get(':projectId')
  findOne(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projectsService.findOne(orgId, projectId);
  }

  @Roles(OrgRole.MEMBER)
  @Patch(':projectId')
  update(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(orgId, projectId, dto);
  }

  @Roles(OrgRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Patch(':projectId/archive')
  archive(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projectsService.archive(orgId, projectId);
  }

  @Roles(OrgRole.VIEWER)
  @Get(':projectId/stats')
  getStats(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projectsService.getStats(orgId, projectId);
  }

  @Roles(OrgRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':projectId')
  remove(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projectsService.remove(orgId, projectId);
  }
}

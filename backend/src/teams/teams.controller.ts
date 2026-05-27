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
import { TeamsService } from './teams.service';
import { AddTeamMemberDto, CreateTeamDto, UpdateTeamDto } from './dto/team.dto';

@UseGuards(JwtAccessGuard, RolesGuard)
@Controller('orgs/:orgId/teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  // ── Team CRUD ─────────────────────────────────────────────────────────────

  @Roles(OrgRole.ADMIN)
  @Post()
  create(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTeamDto,
  ) {
    return this.teamsService.create(orgId, user.sub, dto);
  }

  @Roles(OrgRole.VIEWER)
  @Get()
  findAll(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.teamsService.findAll(orgId);
  }

  @Roles(OrgRole.VIEWER)
  @Get(':teamId')
  findOne(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('teamId', ParseUUIDPipe) teamId: string,
  ) {
    return this.teamsService.findOne(orgId, teamId);
  }

  @Roles(OrgRole.ADMIN)
  @Patch(':teamId')
  update(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teamsService.update(orgId, teamId, dto);
  }

  @Roles(OrgRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':teamId')
  remove(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('teamId', ParseUUIDPipe) teamId: string,
  ) {
    return this.teamsService.remove(orgId, teamId);
  }

  // ── Team membership ───────────────────────────────────────────────────────

  @Roles(OrgRole.ADMIN)
  @Post(':teamId/members')
  addMember(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() dto: AddTeamMemberDto,
  ) {
    return this.teamsService.addMember(orgId, teamId, dto);
  }

  @Roles(OrgRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':teamId/members/:userId')
  removeMember(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
  ) {
    return this.teamsService.removeMember(orgId, teamId, targetUserId);
  }
}

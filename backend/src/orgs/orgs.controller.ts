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
import { OrgsService } from './orgs.service';
import { CreateOrgDto, UpdateMemberRoleDto, UpdateOrgDto } from './dto/org.dto';

@UseGuards(JwtAccessGuard)
@Controller('orgs')
export class OrgsController {
  constructor(private readonly orgsService: OrgsService) {}

  // ── Org CRUD ──────────────────────────────────────────────────────────────

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateOrgDto) {
    return this.orgsService.create(user.sub, dto);
  }

  @Get()
  findMyOrgs(@CurrentUser() user: JwtPayload) {
    return this.orgsService.findMyOrgs(user.sub);
  }

  @UseGuards(RolesGuard)
  @Roles(OrgRole.VIEWER)
  @Get(':orgId')
  findOne(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.orgsService.findOne(orgId);
  }

  @UseGuards(RolesGuard)
  @Roles(OrgRole.ADMIN)
  @Patch(':orgId')
  update(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: UpdateOrgDto,
  ) {
    return this.orgsService.update(orgId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(OrgRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':orgId')
  remove(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.orgsService.remove(orgId);
  }

  // ── Member management ─────────────────────────────────────────────────────

  @UseGuards(RolesGuard)
  @Roles(OrgRole.VIEWER)
  @Get(':orgId/members')
  getMembers(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.orgsService.getMembers(orgId);
  }

  @UseGuards(RolesGuard)
  @Roles(OrgRole.ADMIN)
  @Patch(':orgId/members/:userId/role')
  updateMemberRole(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.orgsService.updateMemberRole(orgId, targetUserId, dto, user.sub);
  }

  @UseGuards(RolesGuard)
  @Roles(OrgRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':orgId/members/:userId')
  removeMember(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.orgsService.removeMember(orgId, targetUserId, user.sub);
  }
}

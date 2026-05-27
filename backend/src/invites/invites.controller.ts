import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrgRole } from '../entities/org-member.entity';
import type { JwtPayload } from '../auth/auth.types';
import { InvitesService } from './invites.service';
import { AcceptInviteDto, CreateInviteDto } from './dto/invite.dto';

@UseGuards(JwtAccessGuard)
@Controller()
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  // ── Org-scoped invite management (ADMIN+) ─────────────────────────────────

  @UseGuards(RolesGuard)
  @Roles(OrgRole.ADMIN)
  @Post('orgs/:orgId/invites')
  createInvite(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateInviteDto,
  ) {
    return this.invitesService.create(orgId, user.sub, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(OrgRole.ADMIN)
  @Get('orgs/:orgId/invites')
  listInvites(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.invitesService.listPending(orgId);
  }

  @UseGuards(RolesGuard)
  @Roles(OrgRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('orgs/:orgId/invites/:inviteId')
  revokeInvite(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
  ) {
    return this.invitesService.revoke(orgId, inviteId);
  }

  // ── Accept invite (any authenticated user) ────────────────────────────────

  @HttpCode(HttpStatus.OK)
  @Post('invites/accept')
  acceptInvite(
    @Body() dto: AcceptInviteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invitesService.accept(dto, user.sub, user.email);
  }
}

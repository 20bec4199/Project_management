import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.types';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAccessGuard)
@Controller('orgs/:orgId/notifications')
export class NotificationsController {
  constructor(private readonly notifService: NotificationsService) {}

  /** GET /api/orgs/:orgId/notifications – list latest 50 */
  @Get()
  list(@Param('orgId') orgId: string, @CurrentUser() user: JwtPayload) {
    return this.notifService.findAll(user.sub, orgId);
  }

  /** GET /api/orgs/:orgId/notifications/unread-count */
  @Get('unread-count')
  async unreadCount(
    @Param('orgId') orgId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const count = await this.notifService.getUnreadCount(user.sub, orgId);
    return { count };
  }

  /** PATCH /api/orgs/:orgId/notifications/read-all */
  @Patch('read-all')
  markAllRead(@Param('orgId') orgId: string, @CurrentUser() user: JwtPayload) {
    return this.notifService.markAllRead(user.sub, orgId);
  }

  /** PATCH /api/orgs/:orgId/notifications/:id/read */
  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.notifService.markRead(user.sub, id);
  }
}

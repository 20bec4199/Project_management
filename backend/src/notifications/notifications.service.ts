import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from '../entities/notification.entity';
import { User } from '../entities/user.entity';
import { MailService } from '../mail/mail.service';
import { EventsGateway } from '../events/events.gateway';

export interface CreateNotificationInput {
  userId: string;
  orgId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
}

const EMAIL_SUBJECTS: Record<NotificationType, string> = {
  [NotificationType.TASK_ASSIGNED]: 'You have been assigned a task',
  [NotificationType.TASK_UPDATED]: 'A task was updated',
  [NotificationType.COMMENT_ADDED]: 'New comment on a task',
  [NotificationType.MEMBER_JOINED]: 'A new member joined your organisation',
  [NotificationType.PROJECT_CREATED]: 'A new project was created',
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mailService: MailService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // ── Create & push ─────────────────────────────────────────────────────────

  async create(input: CreateNotificationInput): Promise<Notification> {
    const notif = this.notifRepo.create(input);
    const saved = await this.notifRepo.save(notif);

    // Real-time push to the recipient's personal room
    this.eventsGateway.emitNotification(input.userId, saved);

    // Email is fire-and-forget so it never blocks the response
    this.sendEmailNotification(input).catch(() => {});

    return saved;
  }

  private async sendEmailNotification(
    input: CreateNotificationInput,
  ): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: input.userId } });
    if (!user?.email) return;

    const subject =
      EMAIL_SUBJECTS[input.type] ?? 'You have a new notification';
    const html = `
      <p>${subject}</p>
      <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
        ${Object.entries(input.payload)
          .map(
            ([k, v]) =>
              `<tr><td style="padding:4px 8px;font-weight:bold">${k}</td>
               <td style="padding:4px 8px">${String(v)}</td></tr>`,
          )
          .join('')}
      </table>
    `;
    await this.mailService.sendMail(user.email, subject, html);
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  async findAll(userId: string, orgId: string): Promise<Notification[]> {
    return this.notifRepo.find({
      where: { userId, orgId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async getUnreadCount(userId: string, orgId: string): Promise<number> {
    return this.notifRepo.count({ where: { userId, orgId, isRead: false } });
  }

  async markRead(userId: string, notifId: string): Promise<void> {
    await this.notifRepo.update({ id: notifId, userId }, { isRead: true });
  }

  async markAllRead(userId: string, orgId: string): Promise<void> {
    await this.notifRepo.update(
      { userId, orgId, isRead: false },
      { isRead: true },
    );
  }
}

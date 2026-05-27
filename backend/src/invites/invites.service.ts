import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { OrgInvite } from '../entities/org-invite.entity';
import { OrgMember } from '../entities/org-member.entity';
import { User } from '../entities/user.entity';
import { Tenant } from '../entities/tenant.entity';
import { CreateInviteDto, AcceptInviteDto } from './dto/invite.dto';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { PlanLimitsService } from '../common/services/plan-limits.service';

/** How many hours an invite token stays valid. */
const INVITE_TTL_HOURS = 72;

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);

  constructor(
    @InjectRepository(OrgInvite)
    private readonly inviteRepo: Repository<OrgInvite>,
    @InjectRepository(OrgMember)
    private readonly memberRepo: Repository<OrgMember>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly planLimits: PlanLimitsService,
  ) {}

  /**
   * Creates an invite for `email` in `orgId`.
   * Returns the **raw** token — caller is responsible for delivering it
   * (e.g. via email). Only the SHA-256 hash is persisted.
   */
  async create(
    orgId: string,
    invitedBy: string,
    dto: CreateInviteDto,
  ): Promise<{ inviteId: string; token: string; expiresAt: Date }> {
    // Enforce plan-based member limit before creating invite
    await this.planLimits.assertMemberLimit(orgId);

    // Prevent duplicate pending invites for the same email + org
    const existing = await this.inviteRepo.findOne({
      where: {
        orgId,
        email: dto.email,
        acceptedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });
    if (existing) {
      throw new ConflictException('A pending invite for this email already exists');
    }

    const rawToken = randomBytes(32).toString('hex'); // 256-bit entropy
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);

    const invite = this.inviteRepo.create({
      orgId,
      invitedBy,
      email: dto.email,
      role: dto.role,
      tokenHash,
      expiresAt,
    });
    await this.inviteRepo.save(invite);

    // Send greeting / invite email (fire-and-forget)
    this.sendInviteEmail({
      orgId,
      invitedBy,
      toEmail: dto.email,
      role: dto.role,
      token: rawToken,
      expiresAt,
    }).catch((err: Error) =>
      this.logger.error(`Invite email failed for ${dto.email}: ${err.stack ?? err.message}`),
    );

    return { inviteId: invite.id, token: rawToken, expiresAt };
  }

  // ── Email ─────────────────────────────────────────────────────────────────

  private async sendInviteEmail(params: {
    orgId: string;
    invitedBy: string;
    toEmail: string;
    role: string;
    token: string;
    expiresAt: Date;
  }): Promise<void> {
    // Fetch org name and inviter email in parallel
    const [org, inviter] = await Promise.all([
      this.tenantRepo.findOne({ where: { id: params.orgId } }),
      this.userRepo.findOne({ where: { id: params.invitedBy } }),
    ]);

    const orgName = org?.name ?? 'an organisation';
    const inviterEmail = inviter?.email ?? 'A team member';
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const acceptUrl = `${frontendUrl}/invites/accept?token=${params.token}`;
    const expiryStr = params.expiresAt.toUTCString();

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:8px;overflow:hidden;
                    box-shadow:0 2px 8px rgba(0,0,0,.08)">

        <!-- Header -->
        <tr>
          <td style="background:#4f46e5;padding:32px 40px;text-align:center">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:.5px">
              You're invited! 🎉
            </h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 24px">
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6">
              Hi there,
            </p>
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6">
              <strong>${inviterEmail}</strong> has invited you to join
              <strong>${orgName}</strong> as a
              <strong style="text-transform:capitalize">${params.role}</strong>.
            </p>
            <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.6">
              Click the button below to accept your invitation and get started.
              This link expires on <strong>${expiryStr}</strong>.
            </p>

            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px">
              <tr>
                <td style="background:#4f46e5;border-radius:6px;text-align:center">
                  <a href="${acceptUrl}"
                     style="display:inline-block;padding:14px 32px;color:#ffffff;
                            font-size:15px;font-weight:600;text-decoration:none;
                            letter-spacing:.3px">
                    Accept Invitation
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;line-height:1.5">
              Or copy and paste this link into your browser:
            </p>
            <p style="margin:0 0 24px;font-size:12px;color:#6366f1;word-break:break-all">
              ${acceptUrl}
            </p>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px">

            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5">
              If you didn't expect this invitation, you can safely ignore this email.
              The link will expire automatically.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:16px 40px;text-align:center">
            <p style="margin:0;font-size:12px;color:#9ca3af">
              © ${new Date().getFullYear()} ${orgName}. All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await this.mailService.sendMail(
      params.toEmail,
      `You've been invited to join ${orgName}`,
      html,
    );
  }

  // ── Listing & management ──────────────────────────────────────────────────

  async listPending(orgId: string): Promise<OrgInvite[]> {
    return this.inviteRepo.find({
      where: { orgId, acceptedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async revoke(orgId: string, inviteId: string): Promise<void> {
    const invite = await this.inviteRepo.findOne({
      where: { id: inviteId, orgId },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    await this.inviteRepo.remove(invite);
  }

  /**
   * Accepts an invite.
   * The caller's email (from JWT) must match the invite's email.
   * Idempotent: if the user is already a member the invite is still marked accepted.
   */
  async accept(
    dto: AcceptInviteDto,
    userId: string,
    userEmail: string,
  ): Promise<{ orgId: string; orgName: string; role: string }> {
    const tokenHash = hashToken(dto.token);

    const invite = await this.inviteRepo.findOne({
      where: {
        tokenHash,
        acceptedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!invite) {
      throw new BadRequestException('Invite token is invalid or has expired');
    }

    if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new BadRequestException('This invite was sent to a different email address');
    }

    // Check if user is already a member (idempotent)
    const existing = await this.memberRepo.findOne({
      where: { orgId: invite.orgId, userId },
    });

    if (!existing) {
      const membership = this.memberRepo.create({
        orgId: invite.orgId,
        userId,
        role: invite.role,
      });
      await this.memberRepo.save(membership);
    }

    // Mark invite as accepted
    invite.acceptedAt = new Date();
    await this.inviteRepo.save(invite);

    // Invalidate org members cache
    await this.redisService.invalidateCache(`org:${invite.orgId}:members`);

    const org = await this.tenantRepo.findOne({ where: { id: invite.orgId } });

    return {
      orgId: invite.orgId,
      orgName: org?.name ?? 'your organisation',
      role: invite.role,
    };
  }
}

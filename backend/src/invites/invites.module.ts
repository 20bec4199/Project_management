import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgInvite } from '../entities/org-invite.entity';
import { OrgMember } from '../entities/org-member.entity';
import { User } from '../entities/user.entity';
import { Tenant } from '../entities/tenant.entity';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrgInvite, OrgMember, User, Tenant]),
    MailModule,
  ],
  controllers: [InvitesController],
  providers: [InvitesService],
})
export class InvitesModule {}

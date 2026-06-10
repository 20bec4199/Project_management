import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';
import { Tenant } from './entities/tenant.entity';
import { User } from './entities/user.entity';
import { OrgMember } from './entities/org-member.entity';
import { OrgInvite } from './entities/org-invite.entity';
import { Project } from './entities/project.entity';
import { Task } from './entities/task.entity';
import { TaskComment } from './entities/task-comment.entity';
import { TaskActivity } from './entities/task-activity.entity';
import { Notification } from './entities/notification.entity';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { Label } from './entities/label.entity';
import { CommonModule } from './common/common.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { OrgsModule } from './orgs/orgs.module';
import { InvitesModule } from './invites/invites.module';
import { TeamsModule } from './teams/teams.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { EventsModule } from './events/events.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UsersModule } from './users/users.module';
import { LabelsModule } from './labels/labels.module';
import { HealthModule } from './health/health.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    // ── Config ────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'local'}`, '.env'],
      validate: validateEnv,
    }),

    // ── Rate limiting (global: 100 req / 60 s per IP; auth overrides to 10) ──
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // ── Database ──────────────────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow<string>('DB_HOST'),
        port: config.getOrThrow<number>('DB_PORT'),
        username: config.getOrThrow<string>('DB_USERNAME'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        database: config.getOrThrow<string>('DB_NAME'),
        ssl: config.get<string>('DB_SSL') !== 'false'
          ? { rejectUnauthorized: false }
          : false,
        entities: [
          Tenant,
          User,
          OrgMember,
          OrgInvite,
          Project,
          Task,
          TaskComment,
          TaskActivity,
          Notification,
          Team,
          TeamMember,
          Label,
        ],
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),

    // ── Shared ────────────────────────────────────────────────────────────
    CommonModule,
    RedisModule,

    // ── Feature modules ───────────────────────────────────────────────────
    AuthModule,
    UsersModule,
    OrgsModule,
    InvitesModule,
    TeamsModule,
    ProjectsModule,
    TasksModule,
    EventsModule,
    NotificationsModule,
    LabelsModule,
    HealthModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply ThrottlerGuard globally; auth controller overrides with stricter limits
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}

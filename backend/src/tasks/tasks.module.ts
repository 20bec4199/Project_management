import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Task } from '../entities/task.entity';
import { TaskComment } from '../entities/task-comment.entity';
import { TaskActivity } from '../entities/task-activity.entity';
import { Project } from '../entities/project.entity';
import { OrgMember } from '../entities/org-member.entity';
import { Label } from '../entities/label.entity';
import { User } from '../entities/user.entity';

import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { CommentsService } from './comments.service';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      TaskComment,
      TaskActivity,
      Project,
      OrgMember,
      Label,
      User,
    ]),
    EventsModule,
    NotificationsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService, CommentsService],
  exports: [TasksService],
})
export class TasksModule {}
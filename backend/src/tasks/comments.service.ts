import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskComment } from '../entities/task-comment.entity';
import { TasksService } from './tasks.service';
import { ActivityAction } from '../entities/task-activity.entity';
import { CreateCommentDto } from './dto/comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(TaskComment)
    private readonly commentRepo: Repository<TaskComment>,
    private readonly tasksService: TasksService,
  ) {}

  async create(
    orgId: string,
    taskId: string,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<TaskComment> {
    await this.tasksService.findOne(orgId, taskId); // 404 guard

    const comment = this.commentRepo.create({
      taskId,
      orgId,
      authorId: userId,
      body: dto.body,
    });
    await this.commentRepo.save(comment);

    await this.tasksService.logActivity(taskId, orgId, userId, ActivityAction.COMMENTED, {
      commentId: comment.id,
      preview: dto.body.slice(0, 100),
    });

    return comment;
  }

  async findAll(orgId: string, taskId: string): Promise<TaskComment[]> {
    await this.tasksService.findOne(orgId, taskId);
    return this.commentRepo.find({
      where: { taskId, orgId },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });
  }

  async remove(orgId: string, taskId: string, commentId: string, userId: string): Promise<void> {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId, taskId, orgId },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    // Only the author can delete their own comment
    if (comment.authorId !== userId) {
      throw new NotFoundException('Comment not found');
    }
    await this.commentRepo.remove(comment);
  }
}

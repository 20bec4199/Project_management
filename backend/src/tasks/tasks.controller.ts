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
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrgRole } from '../entities/org-member.entity';
import type { JwtPayload } from '../auth/auth.types';
import { TasksService } from './tasks.service';
import { CommentsService } from './comments.service';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from './dto/task.dto';
import { CreateCommentDto } from './dto/comment.dto';

@UseGuards(JwtAccessGuard, RolesGuard)
@Controller('orgs/:orgId/tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly commentsService: CommentsService,
  ) {}

  // ── Tasks ─────────────────────────────────────────────────────────────────

  @Roles(OrgRole.MEMBER)
  @Post()
  create(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(orgId, user.sub, dto);
  }

  @Roles(OrgRole.VIEWER)
  @Get()
  findAll(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query() query: TaskQueryDto,
  ) {
    return this.tasksService.findPaginated(orgId, query);
  }

  @Roles(OrgRole.VIEWER)
  @Get(':taskId')
  findOne(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.tasksService.findOne(orgId, taskId);
  }

  @Roles(OrgRole.MEMBER)
  @Patch(':taskId')
  update(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(orgId, taskId, user.sub, dto);
  }

  @Roles(OrgRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':taskId')
  remove(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.tasksService.remove(orgId, taskId);
  }

  // ── Activity log ──────────────────────────────────────────────────────────

  @Roles(OrgRole.VIEWER)
  @Get(':taskId/activity')
  getActivity(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.tasksService.getActivity(orgId, taskId);
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  @Roles(OrgRole.MEMBER)
  @Post(':taskId/comments')
  createComment(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(orgId, taskId, user.sub, dto);
  }

  @Roles(OrgRole.VIEWER)
  @Get(':taskId/comments')
  listComments(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.commentsService.findAll(orgId, taskId);
  }

  @Roles(OrgRole.MEMBER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':taskId/comments/:commentId')
  deleteComment(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.commentsService.remove(orgId, taskId, commentId, user.sub);
  }
}

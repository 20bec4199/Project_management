import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, ProjectStatus } from '../entities/project.entity';
import { Task } from '../entities/task.entity';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { RedisService } from '../redis/redis.service';
import { PlanLimitsService } from '../common/services/plan-limits.service';

export interface ProjectStats {
  total: number;
  byStatus: Record<string, number>;
}

@Injectable()
export class ProjectsService {
  private static readonly PROJECTS_TTL = 5 * 60; // 5 minutes
  private static readonly STATS_TTL = 2 * 60;    // 2 minutes

  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly redisService: RedisService,
    private readonly planLimits: PlanLimitsService,
  ) {}

  async create(orgId: string, userId: string, dto: CreateProjectDto): Promise<Project> {
    await this.planLimits.assertProjectLimit(orgId);

    const project = this.projectRepo.create({
      orgId,
      createdBy: userId,
      ...dto,
    });
    const saved = await this.projectRepo.save(project);
    await this.redisService.invalidateCache(`org:${orgId}:projects`);
    return saved;
  }

  async findAll(orgId: string): Promise<Project[]> {
    const cacheKey = `org:${orgId}:projects`;
    const cached = await this.redisService.getCache<Project[]>(cacheKey);
    if (cached) return cached;

    const projects = await this.projectRepo.find({
      where: { orgId },
      order: { name: 'ASC' },
    });

    await this.redisService.setCache(cacheKey, projects, ProjectsService.PROJECTS_TTL);
    return projects;
  }

  async findOne(orgId: string, projectId: string): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId, orgId },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async getStats(orgId: string, projectId: string): Promise<ProjectStats> {
    // Ensure project exists and belongs to org
    await this.findOne(orgId, projectId);

    const cacheKey = `org:${orgId}:project:${projectId}:stats`;
    const cached = await this.redisService.getCache<ProjectStats>(cacheKey);
    if (cached) return cached;

    const rows = await this.taskRepo
      .createQueryBuilder('t')
      .select('t.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('t.projectId = :projectId AND t.orgId = :orgId', { projectId, orgId })
      .groupBy('t.status')
      .getRawMany<{ status: string; count: string }>();

    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const row of rows) {
      byStatus[row.status] = parseInt(row.count, 10);
      total += byStatus[row.status];
    }

    const stats: ProjectStats = { total, byStatus };
    await this.redisService.setCache(cacheKey, stats, ProjectsService.STATS_TTL);
    return stats;
  }

  async update(orgId: string, projectId: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(orgId, projectId);
    Object.assign(project, dto);
    const saved = await this.projectRepo.save(project);
    await this.redisService.invalidateCache(`org:${orgId}:projects`);
    return saved;
  }

  async archive(orgId: string, projectId: string): Promise<Project> {
    const project = await this.findOne(orgId, projectId);
    project.status = ProjectStatus.ARCHIVED;
    const saved = await this.projectRepo.save(project);
    await this.redisService.invalidateCache(`org:${orgId}:projects`);
    return saved;
  }

  async remove(orgId: string, projectId: string): Promise<void> {
    const project = await this.findOne(orgId, projectId);
    await this.projectRepo.remove(project);
    await this.redisService.invalidateCache(
      `org:${orgId}:projects`,
      `org:${orgId}:project:${projectId}:stats`,
    );
  }
}

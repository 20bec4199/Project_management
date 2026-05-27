import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { OrgMember } from '../entities/org-member.entity';
import { CreateTeamDto, UpdateTeamDto, AddTeamMemberDto } from './dto/team.dto';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepo: Repository<TeamMember>,
    @InjectRepository(OrgMember)
    private readonly orgMemberRepo: Repository<OrgMember>,
  ) {}

  // ── Team CRUD ─────────────────────────────────────────────────────────────

  async create(orgId: string, userId: string, dto: CreateTeamDto): Promise<Team> {
    const team = this.teamRepo.create({ orgId, createdBy: userId, ...dto });
    return this.teamRepo.save(team);
  }

  async findAll(orgId: string): Promise<Team[]> {
    return this.teamRepo.find({
      where: { orgId },
      relations: ['teamMembers', 'teamMembers.user'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(orgId: string, teamId: string): Promise<Team> {
    const team = await this.teamRepo.findOne({
      where: { id: teamId, orgId },
      relations: ['teamMembers', 'teamMembers.user'],
    });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async update(orgId: string, teamId: string, dto: UpdateTeamDto): Promise<Team> {
    const team = await this.findOne(orgId, teamId);
    Object.assign(team, dto);
    return this.teamRepo.save(team);
  }

  async remove(orgId: string, teamId: string): Promise<void> {
    const team = await this.findOne(orgId, teamId);
    await this.teamRepo.remove(team);
  }

  // ── Team membership ───────────────────────────────────────────────────────

  async addMember(
    orgId: string,
    teamId: string,
    dto: AddTeamMemberDto,
  ): Promise<TeamMember> {
    // Verify team belongs to the org
    await this.findOne(orgId, teamId);

    // Target user must be an org member
    const orgMembership = await this.orgMemberRepo.findOne({
      where: { orgId, userId: dto.userId },
    });
    if (!orgMembership) {
      throw new BadRequestException('User is not a member of this organisation');
    }

    const existing = await this.teamMemberRepo.findOne({
      where: { teamId, userId: dto.userId },
    });
    if (existing) throw new ConflictException('User is already a member of this team');

    const member = this.teamMemberRepo.create({
      teamId,
      userId: dto.userId,
      orgId,
    });
    return this.teamMemberRepo.save(member);
  }

  async removeMember(
    orgId: string,
    teamId: string,
    targetUserId: string,
  ): Promise<void> {
    await this.findOne(orgId, teamId);

    const member = await this.teamMemberRepo.findOne({
      where: { teamId, userId: targetUserId, orgId },
    });
    if (!member) throw new NotFoundException('User is not a member of this team');

    await this.teamMemberRepo.remove(member);
  }
}

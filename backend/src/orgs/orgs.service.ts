import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { OrgMember, OrgRole } from '../entities/org-member.entity';
import { CreateOrgDto, UpdateOrgDto, UpdateMemberRoleDto } from './dto/org.dto';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class OrgsService {
  private static readonly MEMBERS_TTL = 5 * 60; // 5 minutes

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(OrgMember)
    private readonly memberRepo: Repository<OrgMember>,
    private readonly redisService: RedisService,
  ) {}

  // ── Org CRUD ──────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateOrgDto): Promise<Tenant> {
    const existing = await this.tenantRepo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Slug "${dto.slug}" is already taken`);

    const tenant = this.tenantRepo.create({ ...dto });
    await this.tenantRepo.save(tenant);

    // Creator becomes OWNER automatically
    const membership = this.memberRepo.create({
      orgId: tenant.id,
      userId,
      role: OrgRole.OWNER,
    });
    await this.memberRepo.save(membership);

    return tenant;
  }

  /** Returns all orgs the given user belongs to. */
  async findMyOrgs(userId: string): Promise<Tenant[]> {
    const memberships = await this.memberRepo.find({
      where: { userId },
      relations: ['org'],
    });
    return memberships.map((m) => m.org);
  }

  async findOne(orgId: string): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({ where: { id: orgId } });
    if (!tenant) throw new NotFoundException('Organisation not found');
    return tenant;
  }

  async update(orgId: string, dto: UpdateOrgDto): Promise<Tenant> {
    const tenant = await this.findOne(orgId);

    if (dto.slug && dto.slug !== tenant.slug) {
      const conflict = await this.tenantRepo.findOne({ where: { slug: dto.slug } });
      if (conflict) throw new ConflictException(`Slug "${dto.slug}" is already taken`);
    }

    Object.assign(tenant, dto);
    return this.tenantRepo.save(tenant);
  }

  async remove(orgId: string): Promise<void> {
    const tenant = await this.findOne(orgId);
    await this.tenantRepo.remove(tenant);
  }

  // ── Member management ─────────────────────────────────────────────────────

  async getMembers(orgId: string): Promise<OrgMember[]> {
    const cacheKey = `org:${orgId}:members`;
    const cached = await this.redisService.getCache<OrgMember[]>(cacheKey);
    if (cached) return cached;

    const members = await this.memberRepo.find({
      where: { orgId },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });

    await this.redisService.setCache(cacheKey, members, OrgsService.MEMBERS_TTL);
    return members;
  }

  async updateMemberRole(
    orgId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
    requesterId: string,
  ): Promise<OrgMember> {
    const target = await this.memberRepo.findOne({
      where: { orgId, userId: targetUserId },
    });
    if (!target) throw new NotFoundException('Member not found');

    // Prevent demoting the last OWNER
    if (target.role === OrgRole.OWNER && dto.role !== OrgRole.OWNER) {
      const ownerCount = await this.memberRepo.count({
        where: { orgId, role: OrgRole.OWNER },
      });
      if (ownerCount <= 1) {
        throw new ForbiddenException('Cannot demote the last owner of an organisation');
      }
    }

    // Only OWNER can promote someone else to OWNER
    if (dto.role === OrgRole.OWNER) {
      const requester = await this.memberRepo.findOne({
        where: { orgId, userId: requesterId },
      });
      if (requester?.role !== OrgRole.OWNER) {
        throw new ForbiddenException('Only an owner can promote another member to owner');
      }
    }

    target.role = dto.role;
    const updated = await this.memberRepo.save(target);
    await this.redisService.invalidateCache(`org:${orgId}:members`);
    return updated;
  }

  async removeMember(
    orgId: string,
    targetUserId: string,
    requesterId: string,
  ): Promise<void> {
    const target = await this.memberRepo.findOne({
      where: { orgId, userId: targetUserId },
    });
    if (!target) throw new NotFoundException('Member not found');

    // Cannot remove the last owner
    if (target.role === OrgRole.OWNER) {
      const ownerCount = await this.memberRepo.count({
        where: { orgId, role: OrgRole.OWNER },
      });
      if (ownerCount <= 1) {
        throw new ForbiddenException('Cannot remove the last owner of an organisation');
      }
    }

    // ADMINs cannot remove OWNERs
    const requester = await this.memberRepo.findOne({
      where: { orgId, userId: requesterId },
    });
    if (requester?.role === OrgRole.ADMIN && target.role === OrgRole.OWNER) {
      throw new ForbiddenException('Admins cannot remove owners');
    }

    await this.memberRepo.remove(target);
    await this.redisService.invalidateCache(`org:${orgId}:members`);
  }
}

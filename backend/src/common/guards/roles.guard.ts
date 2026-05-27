import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  OrgMember,
  OrgRole,
  ROLE_LEVEL,
} from '../../entities/org-member.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../../auth/auth.types';

/**
 * Must be applied AFTER JwtAccessGuard so req.user is populated.
 *
 * Reads the minimum OrgRole from @Roles() metadata, looks up the calling
 * user's membership in the org identified by the :orgId route param, and
 * rejects the request if their role level is insufficient.
 *
 * The resolved OrgMember record is attached to req.membership so service
 * methods can use it without a second DB round-trip.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(OrgMember)
    private readonly orgMemberRepo: Repository<OrgMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<OrgRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles() decoration → route is accessible to any authenticated user
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest<{
      user: JwtPayload;
      params: Record<string, string>;
      membership?: OrgMember;
    }>();

    const user = req.user;
    const orgId = req.params?.orgId;

    if (!user || !orgId) {
      throw new ForbiddenException('Organisation context is required');
    }

    const membership = await this.orgMemberRepo.findOne({
      where: { userId: user.sub, orgId },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this organisation');
    }

    // Hierarchical check: user level must be >= the minimum required level
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userLevel = ROLE_LEVEL[membership.role];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return
    const minRequired = Math.min(...requiredRoles.map((r) => ROLE_LEVEL[r]));

    if (userLevel < minRequired) {
      throw new ForbiddenException('Insufficient role');
    }

    // Attach for use in controllers / services
    req.membership = membership;
    return true;
  }
}

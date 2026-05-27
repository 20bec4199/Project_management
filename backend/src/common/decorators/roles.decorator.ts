import { SetMetadata } from '@nestjs/common';
import { OrgRole } from '../../entities/org-member.entity';

export const ROLES_KEY = 'roles';

/**
 * Declares the minimum OrgRole required to access a route.
 * Roles are hierarchical: OWNER > ADMIN > MEMBER > VIEWER.
 *
 * @example
 * @Roles(OrgRole.ADMIN)   // ADMIN or OWNER may access
 * @Roles(OrgRole.MEMBER)  // MEMBER, ADMIN or OWNER may access
 */
export const Roles = (...roles: OrgRole[]) => SetMetadata(ROLES_KEY, roles);

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../../auth/auth.types';

/**
 * Extracts the authenticated user from the request (set by JwtAccessGuard).
 *
 * @example
 * getMe(@CurrentUser() user: JwtPayload) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    return ctx.switchToHttp().getRequest().user as JwtPayload;
  },
);

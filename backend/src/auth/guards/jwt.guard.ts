import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtAccessGuard extends AuthGuard('jwt-access') {}

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}

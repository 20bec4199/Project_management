import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JwtPayload } from '../auth.types';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    config: ConfigService,
    private readonly redis: RedisService,
  ) {
    super({
      // Accept refresh token from Authorization header OR request body
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => req?.body?.refreshToken ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(_req: Request, payload: JwtPayload): Promise<JwtPayload> {
    const blacklisted = await this.redis.isTokenBlacklisted(payload.jti);
    if (blacklisted) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }
    return payload;
  }
}

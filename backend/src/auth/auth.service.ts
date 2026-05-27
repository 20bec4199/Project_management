import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'crypto';
import { User } from '../entities/user.entity';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';
import { AuthTokens, JwtPayload } from './auth.types';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';

const BCRYPT_ROUNDS = 12;

// Convert "15m" / "7d" strings to seconds for Redis TTL
function parseDurationToSeconds(duration: string): number {
  const units: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 900; // fallback 15 min
  return parseInt(match[1], 10) * (units[match[2]] ?? 1);
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
  ) {}

  // ── Register ──────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = this.userRepo.create({ email: dto.email, passwordHash });
    await this.userRepo.save(user);

    return this.issueTokens(user);
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user);
  }

  // ── Refresh ───────────────────────────────────────────────────────────────

  /**
   * Called after JwtRefreshGuard validates the token.
   * Blacklists the old refresh token (rotation) and issues a new pair.
   */
  async refresh(payload: JwtPayload): Promise<AuthTokens> {
    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('User not found');

    // Blacklist old refresh token jti so it cannot be reused
    const refreshTtl = parseDurationToSeconds(
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    );
    await this.redis.blacklistToken(payload.jti, refreshTtl);

    return this.issueTokens(user);
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  async logout(payload: JwtPayload): Promise<void> {
    const accessTtl = parseDurationToSeconds(
      this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    );
    const refreshTtl = parseDurationToSeconds(
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    );

    // Blacklist current access token and remove stored refresh token
    await Promise.all([
      this.redis.blacklistToken(payload.jti, accessTtl),
      this.redis.deleteRefreshToken(payload.sub),
    ]);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async issueTokens(user: User): Promise<AuthTokens> {
    const jti = randomUUID();

    const basePayload = { sub: user.id, email: user.email, jti };

    const refreshJti = randomUUID();

    const accessExpiresIn = this.config.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    );
    const refreshExpiresIn = this.config.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(basePayload as object, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expiresIn: accessExpiresIn as any,
      }),
      this.jwtService.signAsync({ ...basePayload, jti: refreshJti } as object, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expiresIn: refreshExpiresIn as any,
      }),
    ]);

    // Persist hashed refresh token so it can be validated / revoked
    const refreshTtl = parseDurationToSeconds(
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    );
    const hashedRefresh = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    await this.redis.setRefreshToken(user.id, hashedRefresh, refreshTtl);

    return { accessToken, refreshToken };
  }

  // ── Forgot password ───────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    // Always return success to avoid leaking which emails are registered
    if (!user) return;

    const token = randomBytes(32).toString('hex');
    await this.redis.setPasswordResetToken(token, user.id);

    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const resetLink = `${frontendUrl}/auth/reset-password?token=${token}`;

    await this.mailService.sendMail(
      user.email,
      'Reset your password',
      `<p>Hello,</p>
       <p>You requested a password reset. Click the link below (valid for 15 minutes):</p>
       <p><a href="${resetLink}">${resetLink}</a></p>
       <p>If you did not request this, ignore this email.</p>`,
    );
  }

  // ── Reset password ────────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const userId = await this.redis.getPasswordResetToken(dto.token);
    if (!userId)
      throw new BadRequestException('Reset token is invalid or has expired');

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user)
      throw new BadRequestException('Reset token is invalid or has expired');

    user.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    await this.userRepo.save(user);

    // Invalidate the token and any active refresh tokens
    await Promise.all([
      this.redis.deletePasswordResetToken(dto.token),
      this.redis.deleteRefreshToken(userId),
    ]);
  }
}

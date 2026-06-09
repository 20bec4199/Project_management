import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto';
import { JwtAccessGuard, JwtRefreshGuard } from './guards/jwt.guard';
import type { JwtPayload, AuthResponse, AuthTokens } from './auth.types';

interface AuthRequest extends Request {
  user: JwtPayload;
}

// Auth endpoints get a stricter rate limit: 10 req / 60 s per IP
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  private setTokenCookies(res: Response, tokens: AuthTokens): void {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    const accessMaxAge = 15 * 60 * 1000; // 15 minutes
    const refreshMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: accessMaxAge,
      path: '/',
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: refreshMaxAge,
      // Restrict refresh cookie to the refresh endpoint
      path: '/api/auth/refresh',
    });
  }

  private clearTokenCookies(res: Response): void {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/api/auth/refresh' });
  }

  @UseGuards(JwtAccessGuard)
  @Get('me')
  async me(@Request() req: AuthRequest) {
    return this.authService.getMe(req.user.sub);
  }

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const tokens = await this.authService.register(dto);
    this.setTokenCookies(res, tokens);
    return { user: tokens.user };
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const tokens = await this.authService.login(dto);
    this.setTokenCookies(res, tokens);
    return { user: tokens.user };
  }

  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Request() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const tokens = await this.authService.refresh(req.user);
    this.setTokenCookies(res, tokens);
    return { user: tokens.user };
  }

  @UseGuards(JwtAccessGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(
    @Request() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logout(req.user);
    this.clearTokenCookies(res);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}

import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { ForgotPasswordDto, LoginDto, RefreshDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto';
import { JwtAccessGuard, JwtRefreshGuard } from './guards/jwt.guard';
import { JwtPayload } from './auth.types';

interface AuthRequest extends Request {
  user: JwtPayload;
}

// Auth endpoints get a stricter rate limit: 10 req / 60 s per IP
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Request() req: AuthRequest, @Body() _dto: RefreshDto) {
    return this.authService.refresh(req.user);
  }

  @UseGuards(JwtAccessGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  logout(@Request() req: AuthRequest) {
    return this.authService.logout(req.user);
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

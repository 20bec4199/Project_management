import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt.guard';
import { JwtPayload } from '../auth/auth.types';
import { UsersService } from './users.service';
import { ChangePasswordDto, UpdateProfileDto } from './dto/user.dto';

interface AuthRequest extends Request {
  user: JwtPayload;
}

@UseGuards(JwtAccessGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@Request() req: AuthRequest) {
    return this.usersService.getMe(req.user.sub);
  }

  @Patch('me')
  updateProfile(@Request() req: AuthRequest, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.sub, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch('me/password')
  changePassword(@Request() req: AuthRequest, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(req.user.sub, dto);
  }
}

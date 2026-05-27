import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { ChangePasswordDto, UpdateProfileDto } from './dto/user.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getMe(userId: string): Promise<Omit<User, 'passwordHash' | 'refreshToken'>> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, refreshToken, ...safe } = user;
    return safe;
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<Omit<User, 'passwordHash' | 'refreshToken'>> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.name !== undefined) user.name = dto.name ?? null;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl ?? null;

    const saved = await this.userRepo.save(user);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, refreshToken, ...safe } = saved;
    return safe;
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    user.passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.userRepo.save(user);
  }
}

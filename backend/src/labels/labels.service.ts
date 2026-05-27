import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Label } from '../entities/label.entity';
import { CreateLabelDto, UpdateLabelDto } from './dto/label.dto';

@Injectable()
export class LabelsService {
  constructor(
    @InjectRepository(Label)
    private readonly labelRepo: Repository<Label>,
  ) {}

  findAll(orgId: string): Promise<Label[]> {
    return this.labelRepo.find({ where: { orgId }, order: { name: 'ASC' } });
  }

  async create(orgId: string, dto: CreateLabelDto): Promise<Label> {
    const label = this.labelRepo.create({ orgId, ...dto });
    return this.labelRepo.save(label);
  }

  async update(orgId: string, labelId: string, dto: UpdateLabelDto): Promise<Label> {
    const label = await this.labelRepo.findOne({ where: { id: labelId, orgId } });
    if (!label) throw new NotFoundException('Label not found');
    Object.assign(label, dto);
    return this.labelRepo.save(label);
  }

  async remove(orgId: string, labelId: string): Promise<void> {
    const label = await this.labelRepo.findOne({ where: { id: labelId, orgId } });
    if (!label) throw new NotFoundException('Label not found');
    await this.labelRepo.remove(label);
  }
}

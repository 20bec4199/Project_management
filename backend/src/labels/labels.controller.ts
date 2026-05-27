import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrgRole } from '../entities/org-member.entity';
import { LabelsService } from './labels.service';
import { CreateLabelDto, UpdateLabelDto } from './dto/label.dto';

@UseGuards(JwtAccessGuard, RolesGuard)
@Controller('orgs/:orgId/labels')
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Roles(OrgRole.VIEWER)
  @Get()
  findAll(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.labelsService.findAll(orgId);
  }

  @Roles(OrgRole.MEMBER)
  @Post()
  create(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CreateLabelDto,
  ) {
    return this.labelsService.create(orgId, dto);
  }

  @Roles(OrgRole.ADMIN)
  @Patch(':labelId')
  update(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('labelId', ParseUUIDPipe) labelId: string,
    @Body() dto: UpdateLabelDto,
  ) {
    return this.labelsService.update(orgId, labelId, dto);
  }

  @Roles(OrgRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':labelId')
  remove(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('labelId', ParseUUIDPipe) labelId: string,
  ) {
    return this.labelsService.remove(orgId, labelId);
  }
}

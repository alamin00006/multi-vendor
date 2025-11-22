import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CommissionSettingService } from './commission-setting.service';
import { CreateCommissionSettingDto } from './dtos/create-commission-setting.dto';
import { UpdateCommissionSettingDto } from './dtos/update-commission-setting.dto';
import { QueryCommissionSettingDto } from './dtos/query-commission-setting.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('commission-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommissionSettingController {
  constructor(
    private readonly commissionSettingService: CommissionSettingService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() createCommissionDto: CreateCommissionSettingDto) {
    return this.commissionSettingService.create(createCommissionDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(@Query() query: QueryCommissionSettingDto) {
    return this.commissionSettingService.findWithQuery(query);
  }

  @Get('current')
  async findCurrent() {
    return this.commissionSettingService.findCurrent();
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  async getStats() {
    return this.commissionSettingService.getStats();
  }

  @Get('history')
  @Roles(UserRole.ADMIN)
  async getHistory(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;
    return this.commissionSettingService.getHistory(from, to);
  }

  @Get('calculate')
  @Roles(UserRole.ADMIN)
  async calculateCommission(
    @Query('orderTotal') orderTotal: number,
    @Query('customCommission') customCommission?: number,
  ) {
    return this.commissionSettingService.calculateCommission(
      Number(orderTotal),
      customCommission ? Number(customCommission) : undefined,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.commissionSettingService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCommissionDto: UpdateCommissionSettingDto,
  ) {
    return this.commissionSettingService.update(id, updateCommissionDto);
  }

  @Put('current/update')
  @Roles(UserRole.ADMIN)
  async updateCurrent(@Body() updateCommissionDto: UpdateCommissionSettingDto) {
    return this.commissionSettingService.updateCurrent(updateCommissionDto);
  }

  @Put('reset/default')
  @Roles(UserRole.ADMIN)
  async resetToDefault() {
    return this.commissionSettingService.resetToDefault();
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.commissionSettingService.remove(id);
  }

  @Post('bulk')
  @Roles(UserRole.ADMIN)
  async bulkCreate(@Body() createCommissionDtos: CreateCommissionSettingDto[]) {
    return this.commissionSettingService.bulkCreate(createCommissionDtos);
  }
}

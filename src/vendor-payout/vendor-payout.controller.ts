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
import { VendorPayoutService } from './vendor-payout.service';
import { CreateVendorPayoutDto } from './dto/create-vendor-payout.dto';
import { UpdateVendorPayoutDto } from './dto/update-vendor-payout.dto';
import { QueryVendorPayoutDto } from './dto/query-vendor-payout.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('vendor-payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorPayoutController {
  constructor(private readonly vendorPayoutService: VendorPayoutService) {}

  @Post()
  async create(@Request() req, @Body() createPayoutDto: CreateVendorPayoutDto) {
    return this.vendorPayoutService.create(req.user.id, createPayoutDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(@Query() query: QueryVendorPayoutDto) {
    return this.vendorPayoutService.findWithQuery(query);
  }

  @Get('my-payouts')
  async findMyPayouts(@Request() req) {
    return this.vendorPayoutService.findByUserId(req.user.id);
  }

  @Get('vendor/:vendorId')
  async findByVendorId(
    @Request() req,
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
  ) {
    return this.vendorPayoutService.findByVendorId(
      vendorId,
      req.user.id,
      req.user.role === UserRole.ADMIN,
    );
  }

  @Get('pending')
  @Roles(UserRole.ADMIN)
  async findPending(@Query('limit') limit?: number) {
    // return this.vendorPayoutService.findPending(limit ? parseInt(limit) : undefined);
  }

  @Get('stats')
  async getStats(@Request() req, @Query('vendorId') vendorId?: string) {
    // Non-admins can only see stats for their own vendors
    if (!vendorId && req.user.role !== UserRole.ADMIN) {
      // Get user's vendor ID - adjust based on your business logic
      const userVendor = await this.vendorPayoutService[
        'prisma'
      ].vendor.findFirst({
        // where: { userId: req.user.id },
        select: { id: true },
      });
      vendorId = userVendor?.id;
    }

    return this.vendorPayoutService.getStats(vendorId);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.vendorPayoutService.findOne(
      id,
      req.user.id,
      req.user.role === UserRole.ADMIN,
    );
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePayoutDto: UpdateVendorPayoutDto,
  ) {
    return this.vendorPayoutService.update(id, updatePayoutDto, true);
  }

  @Put(':id/approve')
  @Roles(UserRole.ADMIN)
  async approve(@Param('id', ParseUUIDPipe) id: string) {
    return this.vendorPayoutService.approve(id);
  }

  @Put(':id/reject')
  @Roles(UserRole.ADMIN)
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason?: string,
  ) {
    return this.vendorPayoutService.reject(id, reason);
  }

  @Put(':id/cancel')
  async cancel(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.vendorPayoutService.cancel(id, req.user.id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.vendorPayoutService.remove(id);
  }

  @Post('bulk/approve')
  @Roles(UserRole.ADMIN)
  async bulkApprove(@Body('ids') ids: string[]) {
    return this.vendorPayoutService.bulkApprove(ids);
  }
}

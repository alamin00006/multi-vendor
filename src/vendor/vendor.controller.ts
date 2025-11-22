// src/vendor/vendor.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
  UseInterceptors,
  ClassSerializerInterceptor,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { VendorService } from './vendor.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { QueryVendorDto } from './dto/query-vendor.dto';
import {
  VendorResponseDto,
  VendorWithStatsResponseDto,
  VendorListResponseDto,
  VendorDetailResponseDto,
  VendorStatsResponseDto,
  VendorDashboardResponseDto,
} from './dto/vendor-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('vendors')
@Controller('vendors')
@UseInterceptors(ClassSerializerInterceptor)
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new vendor' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Vendor created successfully',
    type: VendorDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Vendor name, slug or email already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or user already has a vendor',
  })
  async create(@Req() req: any, @Body() createVendorDto: CreateVendorDto) {
    const ownerId = req.user.id;
    const result = await this.vendorService.create(ownerId, createVendorDto);
    return {
      success: true,
      message: result.message,
      data: result.vendor,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all vendors with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'ACTIVE', 'SUSPENDED'],
  })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'includeStats', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vendors retrieved successfully',
    type: VendorListResponseDto,
  })
  async findAll(@Query() query: QueryVendorDto) {
    const result = await this.vendorService.findWithQuery(query);

    return {
      success: true,
      data: result.vendors,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active vendors' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Active vendors retrieved successfully',
    type: VendorListResponseDto,
  })
  async findActive() {
    const vendors = await this.vendorService.findActive();
    return {
      success: true,
      data: vendors,
    };
  }

  @Get('my-vendor')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user vendor' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vendor retrieved successfully',
    type: VendorDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Vendor not found',
  })
  async findMyVendor(@Req() req: any) {
    const ownerId = req.user.id;
    const vendor = await this.vendorService.findByOwnerId(ownerId);
    return {
      success: true,
      data: vendor,
    };
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get vendor dashboard' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vendor dashboard retrieved successfully',
    type: VendorDashboardResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Vendor not found',
  })
  async getVendorDashboard(@Req() req: any) {
    const ownerId = req.user.id;
    const vendor = await this.vendorService.findByOwnerId(ownerId);
    const dashboard = await this.vendorService.getVendorDashboard(vendor.id);
    return {
      success: true,
      data: dashboard,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a vendor by ID' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vendor retrieved successfully',
    type: VendorDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Vendor not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const vendor = await this.vendorService.findOne(id);
    return {
      success: true,
      data: vendor,
    };
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get a vendor by slug' })
  @ApiParam({ name: 'slug', description: 'Vendor slug' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vendor retrieved successfully',
    type: VendorDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Vendor not found',
  })
  async findBySlug(@Param('slug') slug: string) {
    const vendor = await this.vendorService.findBySlug(slug);
    return {
      success: true,
      data: vendor,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a vendor' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vendor updated successfully',
    type: VendorDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Vendor not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You can only update your own vendor',
  })
  async update(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateVendorDto: UpdateVendorDto,
  ) {
    const userId = req.user.id;
    const isAdmin = req.user.role === UserRole.ADMIN;
    const result = await this.vendorService.update(
      id,
      updateVendorDto,
      userId,
      isAdmin,
    );
    return {
      success: true,
      message: result.message,
      data: result.vendor,
    };
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update vendor status (admin only)' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vendor status updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Vendor not found',
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
  ) {
    const result = await this.vendorService.updateStatus(id, status);
    return {
      success: true,
      message: result.message,
      data: result.vendor,
    };
  }

  @Put(':id/commission')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update vendor commission percentage (admin only)' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vendor commission updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Vendor not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Commission percentage must be between 0 and 100',
  })
  async updateCommission(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('commissionPct') commissionPct: number,
  ) {
    const result = await this.vendorService.updateCommission(id, commissionPct);
    return {
      success: true,
      message: result.message,
      data: result.vendor,
    };
  }

  @Put('bulk/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk update vendor status (admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vendors status updated successfully',
  })
  async bulkUpdateStatus(
    @Body('ids') ids: string[],
    @Body('status') status: string,
  ) {
    const result = await this.vendorService.bulkUpdateStatus(ids, status);
    return {
      success: true,
      message: result.message,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a vendor' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Vendor deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Vendor not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You can only delete your own vendor',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Cannot delete vendor with associated products, orders or payouts',
  })
  async remove(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const userId = req.user.id;
    const isAdmin = req.user.role === UserRole.ADMIN;
    const result = await this.vendorService.remove(id, userId, isAdmin);
    return {
      success: true,
      message: result.message,
    };
  }

  @Get('stats/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get vendor statistics (admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vendor statistics retrieved successfully',
    type: VendorStatsResponseDto,
  })
  async getStats() {
    const stats = await this.vendorService.getStats();
    return {
      success: true,
      data: stats,
    };
  }
}

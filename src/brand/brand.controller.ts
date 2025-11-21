// src/brand/brand.controller.ts
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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BrandService } from './brand.service';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { QueryBrandDto } from './dto/query-brand.dto';
import {
  BrandResponseDto,
  BrandStatsResponseDto,
  BrandListResponseDto,
  BrandDetailResponseDto,
} from './dto/brand-response.dto';
import { CreateBrandDto } from './dto/create-brand.dto';

@ApiTags('brands')
@Controller('brands')
@UseInterceptors(ClassSerializerInterceptor)
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new brand' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Brand created successfully',
    type: BrandResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Brand name or slug already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async create(@Body() createBrandDto: CreateBrandDto) {
    const result = await this.brandService.create(createBrandDto);
    return {
      success: true,
      message: result.message,
      data: result.brand,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all brands with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isFeatured', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Brands retrieved successfully',
    type: BrandListResponseDto,
  })
  async findAll(@Query() query: QueryBrandDto) {
    const result = await this.brandService.findWithQuery(query);

    return {
      success: true,
      data: result.brands,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active brands' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Active brands retrieved successfully',
    type: BrandListResponseDto,
  })
  async findActive() {
    const brands = await this.brandService.findActive();
    return {
      success: true,
      data: brands,
    };
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get all featured brands' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Featured brands retrieved successfully',
    type: BrandListResponseDto,
  })
  async findFeatured() {
    const brands = await this.brandService.findFeatured();
    return {
      success: true,
      data: brands,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a brand by ID' })
  @ApiParam({ name: 'id', description: 'Brand ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Brand retrieved successfully',
    type: BrandDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Brand not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const brand = await this.brandService.findOne(id);
    return {
      success: true,
      data: brand,
    };
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get a brand by slug' })
  @ApiParam({ name: 'slug', description: 'Brand slug' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Brand retrieved successfully',
    type: BrandDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Brand not found',
  })
  async findBySlug(@Param('slug') slug: string) {
    const brand = await this.brandService.findBySlug(slug);
    return {
      success: true,
      data: brand,
    };
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a brand' })
  @ApiParam({ name: 'id', description: 'Brand ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Brand updated successfully',
    type: BrandResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Brand not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Brand name or slug already exists',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBrandDto: UpdateBrandDto,
  ) {
    const result = await this.brandService.update(id, updateBrandDto);
    return {
      success: true,
      message: result.message,
      data: result.brand,
    };
  }

  @Put(':id/toggle-featured')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle brand featured status' })
  @ApiParam({ name: 'id', description: 'Brand ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Brand featured status toggled successfully',
    type: BrandResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Brand not found',
  })
  async toggleFeatured(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.brandService.toggleFeatured(id);
    return {
      success: true,
      message: result.message,
      data: result.brand,
    };
  }

  @Put(':id/toggle-active')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle brand active status' })
  @ApiParam({ name: 'id', description: 'Brand ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Brand active status toggled successfully',
    type: BrandResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Brand not found',
  })
  async toggleActive(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.brandService.toggleActive(id);
    return {
      success: true,
      message: result.message,
      data: result.brand,
    };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a brand' })
  @ApiParam({ name: 'id', description: 'Brand ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Brand deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Brand not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete brand with associated products',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.brandService.remove(id);
    return {
      success: true,
      message: result.message,
    };
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get brand statistics' })
  @ApiParam({ name: 'id', description: 'Brand ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Brand statistics retrieved successfully',
    type: BrandStatsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Brand not found',
  })
  async getStats(@Param('id', ParseUUIDPipe) id: string) {
    const stats = await this.brandService.getStats(id);
    return {
      success: true,
      data: stats,
    };
  }
}

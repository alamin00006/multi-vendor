// src/product-attribute/product-attribute.controller.ts
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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProductAttributeService } from './product-attribute.service';
import { CreateProductAttributeDto } from './dto/create-product-attribute.dto';
import { UpdateProductAttributeDto } from './dto/update-product-attribute.dto';
import { QueryProductAttributeDto } from './dto/query-product-attribute.dto';
import {
  ProductAttributeResponseDto,
  ProductAttributeWithValuesResponseDto,
  ProductAttributeListResponseDto,
  ProductAttributeDetailResponseDto,
  AttributeStatsResponseDto,
} from './dto/product-attribute-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('product-attributes')
@Controller('product-attributes')
@UseInterceptors(ClassSerializerInterceptor)
export class ProductAttributeController {
  constructor(
    private readonly productAttributeService: ProductAttributeService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product attribute' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Product attribute created successfully',
    type: ProductAttributeDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Product attribute name or slug already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async create(@Body() createProductAttributeDto: CreateProductAttributeDto) {
    const result = await this.productAttributeService.create(
      createProductAttributeDto,
    );
    return {
      success: true,
      message: result.message,
      data: result.productAttribute,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all product attributes with filtering' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: ['TEXT', 'COLOR', 'IMAGE'] })
  @ApiQuery({ name: 'isFilterable', required: false, type: Boolean })
  @ApiQuery({ name: 'includeValues', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product attributes retrieved successfully',
    type: ProductAttributeListResponseDto,
  })
  async findAll(@Query() query: QueryProductAttributeDto) {
    const attributes = await this.productAttributeService.findAll(query);
    return {
      success: true,
      data: attributes,
    };
  }

  @Get('filterable')
  @ApiOperation({ summary: 'Get filterable attributes' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Filterable attributes retrieved successfully',
    type: ProductAttributeListResponseDto,
  })
  async findFilterable() {
    const attributes = await this.productAttributeService.findFilterable();
    return {
      success: true,
      data: attributes,
    };
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get attributes by type' })
  @ApiParam({
    name: 'type',
    description: 'Attribute type',
    enum: ['TEXT', 'COLOR', 'IMAGE'],
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Attributes retrieved successfully',
    type: ProductAttributeListResponseDto,
  })
  async findByType(@Param('type') type: string) {
    const attributes = await this.productAttributeService.findByType(type);
    return {
      success: true,
      data: attributes,
    };
  }

  @Get('for-variants')
  @ApiOperation({ summary: 'Get attributes for product variant creation' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Attributes for variants retrieved successfully',
    type: ProductAttributeListResponseDto,
  })
  async getAttributesForVariants() {
    const attributes =
      await this.productAttributeService.getAttributesForVariants();
    return {
      success: true,
      data: attributes,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product attribute by ID' })
  @ApiParam({ name: 'id', description: 'Product attribute ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product attribute retrieved successfully',
    type: ProductAttributeDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product attribute not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const attribute = await this.productAttributeService.findOne(id);
    return {
      success: true,
      data: attribute,
    };
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get a product attribute by slug' })
  @ApiParam({ name: 'slug', description: 'Product attribute slug' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product attribute retrieved successfully',
    type: ProductAttributeDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product attribute not found',
  })
  async findBySlug(@Param('slug') slug: string) {
    const attribute = await this.productAttributeService.findBySlug(slug);
    return {
      success: true,
      data: attribute,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product attribute' })
  @ApiParam({ name: 'id', description: 'Product attribute ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product attribute updated successfully',
    type: ProductAttributeDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product attribute not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Product attribute name or slug already exists',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductAttributeDto: UpdateProductAttributeDto,
  ) {
    const result = await this.productAttributeService.update(
      id,
      updateProductAttributeDto,
    );
    return {
      success: true,
      message: result.message,
      data: result.productAttribute,
    };
  }

  @Put(':id/toggle-filterable')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle attribute filterable status' })
  @ApiParam({ name: 'id', description: 'Product attribute ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Filterable status toggled successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product attribute not found',
  })
  async toggleFilterable(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.productAttributeService.toggleFilterable(id);
    return {
      success: true,
      message: result.message,
      data: result.productAttribute,
    };
  }

  @Put('bulk/update')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk update attributes' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Attributes updated successfully',
  })
  async bulkUpdate(
    @Body('ids') ids: string[],
    @Body() data: UpdateProductAttributeDto,
  ) {
    const result = await this.productAttributeService.bulkUpdate(ids, data);
    return {
      success: true,
      message: result.message,
    };
  }

  @Post('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder attributes' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Attributes reordered successfully',
  })
  async reorder(@Body() updates: Array<{ id: string; sortOrder: number }>) {
    const result = await this.productAttributeService.reorder(updates);
    return {
      success: true,
      message: result.message,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product attribute' })
  @ApiParam({ name: 'id', description: 'Product attribute ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Product attribute deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product attribute not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete attribute with associated values',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.productAttributeService.remove(id);
    return {
      success: true,
      message: result.message,
    };
  }

  @Get('stats/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get attribute statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Attribute statistics retrieved successfully',
    type: AttributeStatsResponseDto,
  })
  async getStats() {
    const stats = await this.productAttributeService.getStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Post('validate-type')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate attribute type and values compatibility' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Type validation completed',
  })
  async validateAttributeType(
    @Body('type') type: string,
    @Body('values') values: Array<{ colorCode?: string; imageUrl?: string }>,
  ) {
    const isValid = await this.productAttributeService.validateAttributeType(
      type,
      values,
    );
    return {
      success: true,
      data: {
        isValid,
        message: isValid
          ? 'Attribute type and values are compatible'
          : 'Attribute type and values are incompatible',
      },
    };
  }
}

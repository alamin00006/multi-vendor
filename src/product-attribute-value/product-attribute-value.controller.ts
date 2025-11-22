// src/product-attribute-value/product-attribute-value.controller.ts
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
import { ProductAttributeValueService } from './product-attribute-value.service';
import { CreateProductAttributeValueDto } from './dto/create-product-attribute-value.dto';
import { UpdateProductAttributeValueDto } from './dto/update-product-attribute-value.dto';
import { QueryProductAttributeValueDto } from './dto/query-product-attribute-value.dto';
import { BulkCreateAttributeValueDto } from './dto/bulk-create-attribute-value.dto';
import {
  ProductAttributeValueResponseDto,
  ProductAttributeValueWithAttributeResponseDto,
  ProductAttributeValueListResponseDto,
  ProductAttributeValueDetailResponseDto,
  BulkCreateAttributeValueResponseDto,
  AttributeValueUsageResponseDto,
} from './dto/product-attribute-value-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('product-attribute-values')
@Controller('product-attribute-values')
@UseInterceptors(ClassSerializerInterceptor)
export class ProductAttributeValueController {
  constructor(
    private readonly productAttributeValueService: ProductAttributeValueService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product attribute value' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Product attribute value created successfully',
    type: ProductAttributeValueDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Attribute value already exists for this attribute',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or attribute does not exist',
  })
  async create(
    @Body() createProductAttributeValueDto: CreateProductAttributeValueDto,
  ) {
    const result = await this.productAttributeValueService.create(
      createProductAttributeValueDto,
    );
    return {
      success: true,
      message: result.message,
      data: result.productAttributeValue,
    };
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk create attribute values' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Attribute values created successfully',
    type: BulkCreateAttributeValueResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or attribute does not exist',
  })
  async bulkCreate(
    @Body() bulkCreateAttributeValueDto: BulkCreateAttributeValueDto,
  ) {
    const result = await this.productAttributeValueService.bulkCreate(
      bulkCreateAttributeValueDto,
    );
    return {
      success: true,
      message: result.message,
      data: result.data,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all product attribute values with filtering' })
  @ApiQuery({ name: 'attributeId', required: false, type: String })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product attribute values retrieved successfully',
    type: ProductAttributeValueListResponseDto,
  })
  async findAll(@Query() query: QueryProductAttributeValueDto) {
    const attributeValues =
      await this.productAttributeValueService.findAll(query);
    return {
      success: true,
      data: attributeValues,
    };
  }

  @Get('attribute/:attributeId')
  @ApiOperation({ summary: 'Get all values for a specific attribute' })
  @ApiParam({ name: 'attributeId', description: 'Product attribute ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Attribute values retrieved successfully',
    type: ProductAttributeValueListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product attribute not found',
  })
  async findByAttributeId(
    @Param('attributeId', ParseUUIDPipe) attributeId: string,
  ) {
    const attributeValues =
      await this.productAttributeValueService.findByAttributeId(attributeId);
    return {
      success: true,
      data: attributeValues,
    };
  }

  @Get('attribute/slug/:attributeSlug')
  @ApiOperation({ summary: 'Get all values for a specific attribute by slug' })
  @ApiParam({ name: 'attributeSlug', description: 'Product attribute slug' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Attribute values retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product attribute not found',
  })
  async findByAttributeSlug(@Param('attributeSlug') attributeSlug: string) {
    const result =
      await this.productAttributeValueService.findByAttributeSlug(
        attributeSlug,
      );
    return {
      success: true,
      data: result,
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search attribute values' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'attributeId', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Attribute values search completed',
    type: ProductAttributeValueListResponseDto,
  })
  async search(
    @Query('q') searchTerm: string,
    @Query('attributeId') attributeId?: string,
  ) {
    const attributeValues = await this.productAttributeValueService.search(
      searchTerm,
      attributeId,
    );
    return {
      success: true,
      data: attributeValues,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product attribute value by ID' })
  @ApiParam({ name: 'id', description: 'Product attribute value ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product attribute value retrieved successfully',
    type: ProductAttributeValueDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product attribute value not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const attributeValue = await this.productAttributeValueService.findOne(id);
    return {
      success: true,
      data: attributeValue,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product attribute value' })
  @ApiParam({ name: 'id', description: 'Product attribute value ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product attribute value updated successfully',
    type: ProductAttributeValueDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product attribute value not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Attribute value already exists for this attribute',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductAttributeValueDto: UpdateProductAttributeValueDto,
  ) {
    const result = await this.productAttributeValueService.update(
      id,
      updateProductAttributeValueDto,
    );
    return {
      success: true,
      message: result.message,
      data: result.productAttributeValue,
    };
  }

  @Put('attribute/:attributeId/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder attribute values' })
  @ApiParam({ name: 'attributeId', description: 'Product attribute ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Attribute values reordered successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid value order data',
  })
  async reorder(
    @Param('attributeId', ParseUUIDPipe) attributeId: string,
    @Body() valueOrder: Array<{ id: string; sortOrder: number }>,
  ) {
    const result = await this.productAttributeValueService.reorder(
      attributeId,
      valueOrder,
    );
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
  @ApiOperation({ summary: 'Delete a product attribute value' })
  @ApiParam({ name: 'id', description: 'Product attribute value ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Product attribute value deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product attribute value not found',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.productAttributeValueService.remove(id);
    return {
      success: true,
      message: result.message,
    };
  }

  @Delete('attribute/:attributeId/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete all values for an attribute' })
  @ApiParam({ name: 'attributeId', description: 'Product attribute ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'All attribute values deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product attribute not found',
  })
  async removeAllByAttribute(
    @Param('attributeId', ParseUUIDPipe) attributeId: string,
  ) {
    const result =
      await this.productAttributeValueService.removeAllByAttribute(attributeId);
    return {
      success: true,
      message: result.message,
    };
  }

  @Get(':id/usage-stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get attribute value usage statistics' })
  @ApiParam({ name: 'id', description: 'Product attribute value ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Usage statistics retrieved successfully',
    type: AttributeValueUsageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product attribute value not found',
  })
  async getUsageStats(@Param('id', ParseUUIDPipe) id: string) {
    const stats = await this.productAttributeValueService.getUsageStats(id);
    return {
      success: true,
      data: stats,
    };
  }

  @Post('check-uniqueness')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check if attribute value is unique within attribute',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Uniqueness check completed',
  })
  async checkValueUniqueness(
    @Body('attributeId') attributeId: string,
    @Body('value') value: string,
    @Body('excludeId') excludeId?: string,
  ) {
    const isUnique =
      await this.productAttributeValueService.checkValueUniqueness(
        attributeId,
        value,
        excludeId,
      );
    return {
      success: true,
      data: {
        isUnique,
        message: isUnique
          ? 'Value is unique'
          : 'Value already exists for this attribute',
      },
    };
  }
}

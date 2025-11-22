// src/product-variant/product-variant.controller.ts
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
import { ProductVariantService } from './product-variant.service';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { QueryProductVariantDto } from './dto/query-product-variant.dto';
import { BulkUpdateVariantStockDto } from './dto/bulk-update-variant-stock.dto';
import {
  ProductVariantResponseDto,
  ProductVariantWithDetailsResponseDto,
  ProductVariantListResponseDto,
  ProductVariantDetailResponseDto,
  VariantStockResponseDto,
  BulkStockUpdateResponseDto,
} from './dto/product-variant-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('product-variants')
@Controller('product-variants')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class ProductVariantController {
  constructor(private readonly productVariantService: ProductVariantService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product variant' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Product variant created successfully',
    type: ProductVariantDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Variant SKU already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or product does not exist',
  })
  async create(@Body() createProductVariantDto: CreateProductVariantDto) {
    const result = await this.productVariantService.create(
      createProductVariantDto,
    );
    return {
      success: true,
      message: result.message,
      data: result.productVariant,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all product variants with filtering' })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'inStock', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product variants retrieved successfully',
    type: ProductVariantListResponseDto,
  })
  async findAll(@Query() query: QueryProductVariantDto) {
    const variants = await this.productVariantService.findAll(query);
    return {
      success: true,
      data: variants,
    };
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get all variants for a specific product' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product variants retrieved successfully',
    type: ProductVariantListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  async findByProductId(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('includeInactive') includeInactive: boolean = false,
  ) {
    const variants = await this.productVariantService.findByProductId(
      productId,
      includeInactive,
    );
    return {
      success: true,
      data: variants,
    };
  }

  @Get('product/:productId/active')
  @ApiOperation({ summary: 'Get active variants for a product' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Active product variants retrieved successfully',
    type: ProductVariantListResponseDto,
  })
  async findActiveByProductId(
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    const variants =
      await this.productVariantService.findActiveByProductId(productId);
    return {
      success: true,
      data: variants,
    };
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get low stock variants' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Low stock variants retrieved successfully',
    type: ProductVariantListResponseDto,
  })
  async findLowStock() {
    const variants = await this.productVariantService.findLowStock();
    return {
      success: true,
      data: variants,
    };
  }

  @Get('out-of-stock')
  @ApiOperation({ summary: 'Get out of stock variants' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Out of stock variants retrieved successfully',
    type: ProductVariantListResponseDto,
  })
  async findOutOfStock() {
    const variants = await this.productVariantService.findOutOfStock();
    return {
      success: true,
      data: variants,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product variant by ID' })
  @ApiParam({ name: 'id', description: 'Product variant ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product variant retrieved successfully',
    type: ProductVariantDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product variant not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const variant = await this.productVariantService.findOne(id);
    return {
      success: true,
      data: variant,
    };
  }

  @Get('sku/:sku')
  @ApiOperation({ summary: 'Get a product variant by SKU' })
  @ApiParam({ name: 'sku', description: 'Product variant SKU' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product variant retrieved successfully',
    type: ProductVariantDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product variant not found',
  })
  async findBySku(@Param('sku') sku: string) {
    const variant = await this.productVariantService.findBySku(sku);
    return {
      success: true,
      data: variant,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a product variant' })
  @ApiParam({ name: 'id', description: 'Product variant ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product variant updated successfully',
    type: ProductVariantDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product variant not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Variant SKU already exists',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductVariantDto: UpdateProductVariantDto,
  ) {
    const result = await this.productVariantService.update(
      id,
      updateProductVariantDto,
    );
    return {
      success: true,
      message: result.message,
      data: result.productVariant,
    };
  }

  @Put(':id/toggle-active')
  @ApiOperation({ summary: 'Toggle variant active status' })
  @ApiParam({ name: 'id', description: 'Product variant ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Variant status toggled successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product variant not found',
  })
  async toggleActive(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.productVariantService.toggleActive(id);
    return {
      success: true,
      message: result.message,
      data: result.productVariant,
    };
  }

  @Put(':id/stock')
  @ApiOperation({ summary: 'Update variant stock quantity' })
  @ApiParam({ name: 'id', description: 'Product variant ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Variant stock updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product variant not found',
  })
  async updateStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('stockQuantity') stockQuantity: number,
  ) {
    const result = await this.productVariantService.updateStock(
      id,
      stockQuantity,
    );
    return {
      success: true,
      message: result.message,
      data: result.productVariant,
    };
  }

  @Put('bulk/stock')
  @ApiOperation({ summary: 'Bulk update variant stock' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk stock update completed',
    type: BulkStockUpdateResponseDto,
  })
  async bulkUpdateStock(
    @Body() bulkUpdateVariantStockDto: BulkUpdateVariantStockDto,
  ) {
    const result = await this.productVariantService.bulkUpdateStock(
      bulkUpdateVariantStockDto,
    );
    return {
      success: true,
      message: result.message,
      data: result.data,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product variant' })
  @ApiParam({ name: 'id', description: 'Product variant ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Product variant deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product variant not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Cannot delete variant with associated cart items or order items',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.productVariantService.remove(id);
    return {
      success: true,
      message: result.message,
    };
  }

  @Get(':id/stock-info')
  @ApiOperation({ summary: 'Get variant stock information' })
  @ApiParam({ name: 'id', description: 'Product variant ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Stock information retrieved successfully',
    type: VariantStockResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product variant not found',
  })
  async getStockInfo(@Param('id', ParseUUIDPipe) id: string) {
    const stockInfo = await this.productVariantService.getStockInfo(id);
    return {
      success: true,
      data: stockInfo,
    };
  }

  @Post('check-combination')
  @ApiOperation({ summary: 'Check if variant combination already exists' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Combination check completed',
  })
  async checkVariantCombination(
    @Body('productId') productId: string,
    @Body('variantAttributes') variantAttributes: any,
  ) {
    const exists = await this.productVariantService.checkVariantCombination(
      productId,
      variantAttributes,
    );
    return {
      success: true,
      data: {
        exists,
        message: exists
          ? 'Variant combination already exists'
          : 'Variant combination is available',
      },
    };
  }
}

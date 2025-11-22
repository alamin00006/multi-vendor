// src/product-image/product-image.controller.ts
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
import { ProductImageService } from './product-image.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { QueryProductImageDto } from './dto/query-product-image.dto';
import {
  ProductImageResponseDto,
  ProductImageWithProductResponseDto,
  ProductImageListResponseDto,
  ProductImageDetailResponseDto,
  BulkImageUploadResponseDto,
} from './dto/product-image-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('product-images')
@Controller('product-images')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class ProductImageController {
  constructor(private readonly productImageService: ProductImageService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product image' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Product image created successfully',
    type: ProductImageDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or product does not exist',
  })
  async create(@Body() createProductImageDto: CreateProductImageDto) {
    const result = await this.productImageService.create(createProductImageDto);
    return {
      success: true,
      message: result.message,
      data: result.productImage,
    };
  }

  @Post('bulk-upload/:productId')
  @ApiOperation({ summary: 'Bulk upload product images' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Product images uploaded successfully',
    type: BulkImageUploadResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Product does not exist',
  })
  async bulkCreate(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body()
    images: Array<{ imageUrl: string; altText?: string; sortOrder?: number }>,
  ) {
    const result = await this.productImageService.bulkCreate(productId, images);
    return {
      success: true,
      message: result.message,
      data: result.data,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all product images with filtering' })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiQuery({ name: 'isPrimary', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product images retrieved successfully',
    type: ProductImageListResponseDto,
  })
  async findAll(@Query() query: QueryProductImageDto) {
    const images = await this.productImageService.findAll(query);
    return {
      success: true,
      data: images,
    };
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get all images for a specific product' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product images retrieved successfully',
    type: ProductImageListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  async findByProductId(@Param('productId', ParseUUIDPipe) productId: string) {
    const images = await this.productImageService.findByProductId(productId);
    return {
      success: true,
      data: images,
    };
  }

  @Get('product/:productId/primary')
  @ApiOperation({ summary: 'Get primary image for a product' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Primary image retrieved successfully',
    type: ProductImageDetailResponseDto,
  })
  async findPrimaryByProductId(
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    const image =
      await this.productImageService.findPrimaryByProductId(productId);
    return {
      success: true,
      data: image,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product image by ID' })
  @ApiParam({ name: 'id', description: 'Product image ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product image retrieved successfully',
    type: ProductImageDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product image not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const image = await this.productImageService.findOne(id);
    return {
      success: true,
      data: image,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a product image' })
  @ApiParam({ name: 'id', description: 'Product image ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product image updated successfully',
    type: ProductImageDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product image not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductImageDto: UpdateProductImageDto,
  ) {
    const result = await this.productImageService.update(
      id,
      updateProductImageDto,
    );
    return {
      success: true,
      message: result.message,
      data: result.productImage,
    };
  }

  @Put(':id/set-primary')
  @ApiOperation({ summary: 'Set image as primary' })
  @ApiParam({ name: 'id', description: 'Product image ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Image set as primary successfully',
    type: ProductImageDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product image not found',
  })
  async setAsPrimary(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.productImageService.setAsPrimary(id);
    return {
      success: true,
      message: result.message,
      data: result.productImage,
    };
  }

  @Put('reorder/:productId')
  @ApiOperation({ summary: 'Reorder images for a product' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Images reordered successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid image order data',
  })
  async reorder(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() imageOrder: Array<{ id: string; sortOrder: number }>,
  ) {
    const result = await this.productImageService.reorder(
      productId,
      imageOrder,
    );
    return {
      success: true,
      message: result.message,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product image' })
  @ApiParam({ name: 'id', description: 'Product image ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Product image deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product image not found',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.productImageService.remove(id);
    return {
      success: true,
      message: result.message,
    };
  }

  @Delete('product/:productId/all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete all images for a product' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'All product images deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  async removeAllByProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    const result = await this.productImageService.removeAllByProduct(productId);
    return {
      success: true,
      message: result.message,
    };
  }

  @Get('product/:productId/count')
  @ApiOperation({ summary: 'Get image count for a product' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Image count retrieved successfully',
  })
  async getImageCount(@Param('productId', ParseUUIDPipe) productId: string) {
    const result = await this.productImageService.getImageCount(productId);
    return {
      success: true,
      data: result,
    };
  }
}

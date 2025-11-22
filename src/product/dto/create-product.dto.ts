// src/product/dto/create-product.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUrl,
  IsJSON,
  MaxLength,
  Min,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  slug?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sku: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  shortDescription?: string;

  @IsString()
  @IsOptional()
  longDescription?: string;

  @IsJSON()
  @IsOptional()
  specification?: any;

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  basePrice: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  salePrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  costPrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  stockQuantity?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  lowStockThreshold?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  weight?: number;

  @IsJSON()
  @IsOptional()
  dimensions?: any;

  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @IsUUID()
  @IsOptional()
  brandId?: string;

  @IsUrl()
  @IsOptional()
  featuredImageUrl?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isPublished?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isFeatured?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isTaxable?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  hasVariants?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  metaTitle?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  metaDescription?: string;

  @IsUUID()
  @IsNotEmpty()
  vendorId: string; //
}

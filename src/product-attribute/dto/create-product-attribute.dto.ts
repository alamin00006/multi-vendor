// src/product-attribute/dto/create-product-attribute.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { AttributeType } from '@prisma/client';

export class CreateProductAttributeDto {
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
  @MaxLength(255)
  displayName: string;

  @IsEnum(AttributeType)
  @IsNotEmpty()
  type: AttributeType;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isFilterable?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  sortOrder?: number;
}

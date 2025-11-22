// src/product-attribute/dto/query-product-attribute.dto.ts
import { IsOptional, IsBoolean, IsEnum, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { AttributeType } from '@prisma/client';

export class QueryProductAttributeDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(AttributeType)
  @IsOptional()
  type?: AttributeType;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isFilterable?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeValues?: boolean;
}

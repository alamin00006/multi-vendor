// src/brand/dto/query-brand.dto.ts
import {
  IsOptional,
  IsBoolean,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class QueryBrandDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 10;

  @IsString()
  @IsOptional()
  search?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isFeatured?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @IsString()
  @IsOptional()
  sortBy?: string = 'sortOrder';

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'asc';
}

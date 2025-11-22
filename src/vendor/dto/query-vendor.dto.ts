// src/vendor/dto/query-vendor.dto.ts
import {
  IsOptional,
  IsEnum,
  IsNumber,
  IsString,
  Min,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { VendorStatus } from '@prisma/client';

export class QueryVendorDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 20;

  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(VendorStatus)
  @IsOptional()
  status?: VendorStatus;

  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeStats?: boolean;
}

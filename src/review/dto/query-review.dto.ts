// src/review/dto/query-review.dto.ts
import {
  IsOptional,
  IsBoolean,
  IsNumber,
  IsString,
  IsUUID,
  Min,
  IsEnum,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum ReviewSortBy {
  CREATED_AT = 'createdAt',
  RATING = 'rating',
  UPDATED_AT = 'updatedAt',
}

export class QueryReviewDto {
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

  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsUUID()
  @IsOptional()
  orderId?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  rating?: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isApproved?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  hasComment?: boolean;

  @IsEnum(ReviewSortBy)
  @IsOptional()
  sortBy?: ReviewSortBy = ReviewSortBy.CREATED_AT;

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

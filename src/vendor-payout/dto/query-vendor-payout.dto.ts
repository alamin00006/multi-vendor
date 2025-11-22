import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDate,
  Min,
} from 'class-validator';
import { PayoutStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export enum PayoutSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  AMOUNT = 'amount',
  PROCESSED_AT = 'processedAt',
}

export class QueryVendorPayoutDto {
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsString()
  @IsOptional()
  vendorId?: string;

  @IsString()
  @IsOptional()
  requestedBy?: string;

  @IsEnum(PayoutStatus)
  @IsOptional()
  status?: PayoutStatus;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minAmount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  maxAmount?: number;

  @IsString()
  @IsOptional()
  method?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  fromDate?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  toDate?: Date;

  @IsEnum(PayoutSortBy)
  @IsOptional()
  sortBy?: PayoutSortBy = PayoutSortBy.CREATED_AT;

  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

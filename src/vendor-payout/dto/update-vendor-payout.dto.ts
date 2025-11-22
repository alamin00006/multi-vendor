import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  IsEnum,
  Min,
  IsDate,
} from 'class-validator';
import { PayoutStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class UpdateVendorPayoutDto {
  @IsNumber()
  @IsPositive()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  method?: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsEnum(PayoutStatus)
  @IsOptional()
  status?: PayoutStatus;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  processedAt?: Date;
}

import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';
import { PayoutStatus } from '@prisma/client';

export class CreateVendorPayoutDto {
  @IsString()
  vendorId: string;

  @IsNumber()
  @IsPositive()
  @Min(0.01)
  amount: number;

  @IsString()
  method: string;

  @IsString()
  @IsOptional()
  reference?: string;

  // Note: requestedBy is automatically set from the authenticated user
  // Note: status defaults to PENDING
}

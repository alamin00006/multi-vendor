// src/user-address/dto/query-user-address.dto.ts
import { IsOptional, IsEnum, IsString, IsBoolean } from 'class-validator';
import { AddressType } from '@prisma/client';

export class QueryUserAddressDto {
  @IsEnum(AddressType)
  @IsOptional()
  addressType?: AddressType;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

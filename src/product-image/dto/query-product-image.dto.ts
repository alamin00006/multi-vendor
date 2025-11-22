// src/product-image/dto/query-product-image.dto.ts
import { IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryProductImageDto {
  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isPrimary?: boolean;
}

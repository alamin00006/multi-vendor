// src/product-variant/dto/bulk-update-variant-stock.dto.ts
import {
  IsArray,
  IsNotEmpty,
  ValidateNested,
  IsNumber,
  Min,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class VariantStockUpdateDto {
  @IsUUID()
  @IsNotEmpty()
  variantId: string;

  @IsNumber()
  @Min(0)
  stockQuantity: number;
}

export class BulkUpdateVariantStockDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantStockUpdateDto)
  updates: VariantStockUpdateDto[];
}

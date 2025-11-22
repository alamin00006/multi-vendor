// src/product-attribute-value/dto/query-product-attribute-value.dto.ts
import { IsOptional, IsUUID } from 'class-validator';

export class QueryProductAttributeValueDto {
  @IsUUID()
  @IsOptional()
  attributeId?: string;

  @IsUUID()
  @IsOptional()
  productId?: string; // For filtering values used by specific products
}

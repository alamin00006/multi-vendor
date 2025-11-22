// src/product-attribute/dto/product-attribute-response.dto.ts
import { AttributeType } from '@prisma/client';

export class ProductAttributeResponseDto {
  id: string;
  name: string;
  slug: string;
  displayName: string;
  type: AttributeType;
  isFilterable: boolean;
  sortOrder: number;
  createdAt: Date;
}

export class ProductAttributeWithValuesResponseDto extends ProductAttributeResponseDto {
  attributeValues?: Array<{
    id: string;
    value: string;
    displayValue: string;
    colorCode?: string;
    imageUrl?: string;
    sortOrder: number;
  }>;
  valuesCount?: number;
}

export class ProductAttributeListResponseDto {
  success: boolean;
  data: ProductAttributeResponseDto[];
}

export class ProductAttributeDetailResponseDto {
  success: boolean;
  data: ProductAttributeWithValuesResponseDto;
}

export class AttributeStatsResponseDto {
  totalAttributes: number;
  attributesByType: { type: AttributeType; count: number }[];
  filterableAttributes: number;
  attributesWithValues: number;
}

// src/product-attribute-value/dto/product-attribute-value-response.dto.ts

export class ProductAttributeValueResponseDto {
  id: string;
  attributeId: string;
  value: string;
  displayValue: string;
  colorCode?: string;
  imageUrl?: string;
  sortOrder: number;
  createdAt: Date;
}

export class ProductAttributeValueWithAttributeResponseDto extends ProductAttributeValueResponseDto {
  attribute?: {
    id: string;
    name: string;
    slug: string;
    type: string;
    displayName: string;
  };
}

export class ProductAttributeValueListResponseDto {
  success: boolean;
  data: ProductAttributeValueResponseDto[];
}

export class ProductAttributeValueDetailResponseDto {
  success: boolean;
  data: ProductAttributeValueWithAttributeResponseDto;
}

export class BulkCreateAttributeValueResponseDto {
  success: boolean;
  message: string;
  data: {
    created: number;
    failed: number;
    attributeValues: ProductAttributeValueResponseDto[];
    errors?: Array<{
      value: string;
      error: string;
    }>;
  };
}

export class AttributeValueUsageResponseDto {
  attributeValueId: string;
  value: string;
  displayValue: string;
  usageCount: number;
  products?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}

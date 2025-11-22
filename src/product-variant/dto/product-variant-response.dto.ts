// src/product-variant/dto/product-variant-response.dto.ts

export class ProductVariantResponseDto {
  id: string;
  productId: string;
  sku: string;
  variantAttributes: any;
  priceAdjustment: number;
  stockQuantity: number;
  lowStockThreshold: number;
  weightAdjustment: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ProductVariantWithProductResponseDto extends ProductVariantResponseDto {
  product?: {
    id: string;
    name: string;
    slug: string;
    basePrice: number;
    featuredImageUrl?: string;
  };
}

export class ProductVariantWithDetailsResponseDto extends ProductVariantWithProductResponseDto {
  currentPrice?: number;
  isLowStock?: boolean;
  isOutOfStock?: boolean;
}

export class ProductVariantListResponseDto {
  success: boolean;
  data: ProductVariantResponseDto[];
}

export class ProductVariantDetailResponseDto {
  success: boolean;
  data: ProductVariantWithDetailsResponseDto;
}

export class VariantStockResponseDto {
  variantId: string;
  sku: string;
  stockQuantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

export class BulkStockUpdateResponseDto {
  success: boolean;
  message: string;
  data: {
    updated: number;
    failed: number;
    results: Array<{
      variantId: string;
      success: boolean;
      message?: string;
    }>;
  };
}

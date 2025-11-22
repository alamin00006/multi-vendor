// src/product/dto/product-response.dto.ts

export class ProductResponseDto {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription?: string;
  longDescription?: string;
  specification?: any;
  basePrice: number;
  salePrice?: number;
  costPrice?: number;
  stockQuantity: number;
  lowStockThreshold: number;
  weight?: number;
  dimensions?: any;
  categoryId: string;
  brandId?: string;
  featuredImageUrl?: string;
  isPublished: boolean;
  isFeatured: boolean;
  isTaxable: boolean;
  hasVariants: boolean;
  averageRating?: number;
  totalReviews: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ProductWithRelationsResponseDto extends ProductResponseDto {
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  brand?: {
    id: string;
    name: string;
    slug: string;
  };
  images?: any[];
  variants?: any[];
  reviews?: any[];
  reviewCount?: number;
  wishlistCount?: number;
}

export class ProductListResponseDto {
  success: boolean;
  data: ProductResponseDto[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ProductDetailResponseDto {
  success: boolean;
  data: ProductWithRelationsResponseDto;
}

export class ProductStatsResponseDto {
  totalProducts: number;
  publishedProducts: number;
  featuredProducts: number;
  outOfStockProducts: number;
  lowStockProducts: number;
  totalInventoryValue: number;
  averageProductPrice: number;
}

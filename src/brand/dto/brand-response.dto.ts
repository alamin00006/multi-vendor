// src/brand/dto/brand-response.dto.ts
// import { ProductResponseDto } from 'src/product/dto/product-response.dto';

export class BrandResponseDto {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  description?: string;
  websiteUrl?: string;
  isFeatured: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  productCount?: number;
}

// export class BrandWithProductsResponseDto extends BrandResponseDto {
//   products?: ProductResponseDto[];
// }

export class BrandStatsResponseDto {
  brand: {
    id: string;
    name: string;
    slug: string;
  };
  stats: {
    totalProducts: number;
    totalReviews: number;
    averageRating: number;
    totalValue: number;
  };
}

export class BrandListResponseDto {
  success: boolean;
  data: BrandResponseDto[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class BrandDetailResponseDto {
  success: boolean;
  //   data: BrandWithProductsResponseDto;
}

// src/category/dto/category-response.dto.ts

export class CategoryResponseDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  imageUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  productCount?: number;
}

export class CategoryWithChildrenResponseDto extends CategoryResponseDto {
  children?: CategoryResponseDto[];
  parent?: CategoryResponseDto;
}

export class CategoryWithProductsResponseDto extends CategoryResponseDto {
  products?: any[];
  children?: CategoryResponseDto[];
  parent?: CategoryResponseDto;
}

export class CategoryTreeResponseDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  children?: CategoryTreeResponseDto[];
  productCount?: number;
}

export class CategoryListResponseDto {
  success: boolean;
  data: CategoryResponseDto[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class CategoryDetailResponseDto {
  success: boolean;
  data: CategoryWithChildrenResponseDto;
}

export class CategoryStatsResponseDto {
  totalCategories: number;
  activeCategories: number;
  categoriesWithProducts: number;
  topLevelCategories: number;
  subCategories: number;
}

export class ProductImageResponseDto {
  id: string;
  productId: string;
  imageUrl: string;
  altText?: string;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: Date;
}

export class ProductImageWithProductResponseDto extends ProductImageResponseDto {
  product?: {
    id: string;
    name: string;
    slug: string;
  };
}

export class ProductImageListResponseDto {
  success: boolean;
  data: ProductImageResponseDto[];
}

export class ProductImageDetailResponseDto {
  success: boolean;
  data: ProductImageResponseDto;
}

export class BulkImageUploadResponseDto {
  success: boolean;
  message: string;
  data: {
    uploaded: number;
    failed: number;
    images: ProductImageResponseDto[];
  };
}

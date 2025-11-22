// src/review/dto/review-response.dto.ts

export class ReviewResponseDto {
  id: string;
  productId: string;
  userId: string;
  orderId?: string;
  rating: number;
  title?: string;
  comment?: string;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ReviewWithRelationsResponseDto extends ReviewResponseDto {
  product?: {
    id: string;
    name: string;
    slug: string;
    featuredImageUrl?: string;
  };
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  order?: {
    id: string;
    orderNumber: string;
  };
}

export class ReviewListResponseDto {
  success: boolean;
  data: ReviewWithRelationsResponseDto[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ReviewDetailResponseDto {
  success: boolean;
  data: ReviewWithRelationsResponseDto;
}

export class ReviewStatsResponseDto {
  totalReviews: number;
  approvedReviews: number;
  pendingReviews: number;
  averageRating: number;
  ratingDistribution: { rating: number; count: number; percentage: number }[];
  reviewsWithComments: number;
}

export class ProductReviewStatsResponseDto {
  productId: string;
  productName: string;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: { rating: number; count: number; percentage: number }[];
  approvedReviews: number;
}

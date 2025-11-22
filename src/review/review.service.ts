// src/review/review.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { QueryReviewDto, ReviewSortBy } from './dto/query-review.dto';

@Injectable()
export class ReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  private readonly reviewErrorOptions = {
    entity: 'review',
    uniqueFieldMap: {},
    foreignKeyMap: {
      productId: 'Product does not exist',
      userId: 'User does not exist',
      orderId: 'Order does not exist',
    },
    customMessages: {
      P2003: 'Related product, user, or order does not exist',
    },
  };

  // Create a new review
  async create(userId: string, createReviewDto: CreateReviewDto) {
    try {
      const { productId, orderId, ...reviewData } = createReviewDto;

      // Validate product exists
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        throw new BadRequestException('Product does not exist');
      }

      // Validate order exists if provided
      if (orderId) {
        const order = await this.prisma.order.findUnique({
          where: { id: orderId },
        });
        if (!order) {
          throw new BadRequestException('Order does not exist');
        }
        // Verify order belongs to user
        if (order.userId !== userId) {
          throw new ForbiddenException(
            'You can only review products from your own orders',
          );
        }
      }

      // Check if user has already reviewed this product
      const existingReview = await this.prisma.review.findFirst({
        where: {
          productId,
          userId,
        },
      });

      if (existingReview) {
        throw new BadRequestException('You have already reviewed this product');
      }

      const review = await this.prisma.review.create({
        data: {
          ...reviewData,
          productId,
          userId,
          orderId,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              featuredImageUrl: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          order: orderId
            ? {
                select: {
                  id: true,
                  orderNumber: true,
                },
              }
            : false,
        },
      });

      // Update product rating statistics
      await this.updateProductRating(productId);

      return {
        message: 'Review created successfully',
        review,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.reviewErrorOptions,
        'Failed to create review',
      );
    }
  }

  // Get all reviews with pagination and filtering
  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.ReviewWhereInput;
    orderBy?: Prisma.ReviewOrderByWithRelationInput;
    include?: Prisma.ReviewInclude;
  }) {
    try {
      const { skip, take, where, orderBy, include } = params || {};

      const defaultInclude: Prisma.ReviewInclude = {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            featuredImageUrl: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      };

      const reviews = await this.prisma.review.findMany({
        skip,
        take,
        where,
        include: include || defaultInclude,
        orderBy: orderBy || { createdAt: 'desc' },
      });

      return reviews;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.reviewErrorOptions,
        'Failed to fetch reviews',
      );
    }
  }

  // Get reviews with query parameters
  async findWithQuery(query: QueryReviewDto) {
    try {
      const {
        page = 1,
        limit = 20,
        productId,
        userId,
        orderId,
        rating,
        isApproved,
        hasComment,
        sortBy = ReviewSortBy.CREATED_AT,
        sortOrder = 'desc',
      } = query;

      const skip = (page - 1) * limit;
      const where: Prisma.ReviewWhereInput = {};

      if (productId) {
        where.productId = productId;
      }

      if (userId) {
        where.userId = userId;
      }

      if (orderId) {
        where.orderId = orderId;
      }

      if (rating) {
        where.rating = rating;
      }

      if (isApproved !== undefined) {
        where.isApproved = isApproved;
      }

      if (hasComment !== undefined) {
        if (hasComment) {
          where.comment = { not: null };
        } else {
          where.comment = null;
        }
      }

      // Build orderBy based on sortBy and sortOrder
      let orderBy: Prisma.ReviewOrderByWithRelationInput;
      switch (sortBy) {
        case ReviewSortBy.RATING:
          orderBy = { rating: sortOrder };
          break;
        case ReviewSortBy.UPDATED_AT:
          orderBy = { updatedAt: sortOrder };
          break;
        default:
          orderBy = { createdAt: sortOrder };
      }

      const [reviews, total] = await Promise.all([
        this.prisma.review.findMany({
          skip,
          take: limit,
          where,
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                featuredImageUrl: true,
              },
            },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
            order: orderId
              ? {
                  select: {
                    id: true,
                    orderNumber: true,
                  },
                }
              : false,
          },
          orderBy,
        }),
        this.prisma.review.count({ where }),
      ]);

      return {
        reviews,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.reviewErrorOptions,
        'Failed to fetch reviews with query',
      );
    }
  }

  // Get approved reviews for a product (public access)
  async findApprovedByProductId(productId: string, limit?: number) {
    try {
      // Validate product exists
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      const reviews = await this.prisma.review.findMany({
        where: {
          productId,
          isApproved: true,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return reviews;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.reviewErrorOptions,
        `Failed to fetch approved reviews for product ${productId}`,
      );
    }
  }

  // Get user's reviews
  async findByUserId(userId: string, includeUnapproved: boolean = false) {
    try {
      const where: Prisma.ReviewWhereInput = { userId };
      if (!includeUnapproved) {
        where.isApproved = true;
      }

      const reviews = await this.prisma.review.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              featuredImageUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return reviews;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.reviewErrorOptions,
        `Failed to fetch reviews for user ${userId}`,
      );
    }
  }

  // Get pending reviews (for admin moderation)
  async findPending(limit?: number) {
    try {
      const reviews = await this.prisma.review.findMany({
        where: {
          isApproved: false,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
      });

      return reviews;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.reviewErrorOptions,
        'Failed to fetch pending reviews',
      );
    }
  }

  // Get a single review by ID
  async findOne(id: string) {
    try {
      const review = await this.prisma.review.findUnique({
        where: { id },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              featuredImageUrl: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
        },
      });

      if (!review) {
        throw new NotFoundException(`Review with ID ${id} not found`);
      }

      return review;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.reviewErrorOptions,
        `Failed to fetch review with ID ${id}`,
      );
    }
  }

  // Update review
  async update(
    id: string,
    userId: string,
    updateReviewDto: UpdateReviewDto,
    isAdmin: boolean = false,
  ) {
    try {
      // Check if review exists and user owns it
      const existingReview = await this.prisma.review.findUnique({
        where: { id },
      });

      if (!existingReview) {
        throw new NotFoundException(`Review with ID ${id} not found`);
      }

      // Only allow user to update their own reviews, unless admin
      if (!isAdmin && existingReview.userId !== userId) {
        throw new ForbiddenException('You can only update your own reviews');
      }

      const updatedReview = await this.prisma.review.update({
        where: { id },
        data: updateReviewDto,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              featuredImageUrl: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      });

      // Update product rating statistics if rating changed
      if (updateReviewDto.rating !== undefined) {
        await this.updateProductRating(existingReview.productId);
      }

      return {
        message: 'Review updated successfully',
        review: updatedReview,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.reviewErrorOptions,
        `Failed to update review with ID ${id}`,
      );
    }
  }

  // Approve review (admin only)
  async approve(id: string) {
    try {
      const review = await this.prisma.review.findUnique({
        where: { id },
      });

      if (!review) {
        throw new NotFoundException(`Review with ID ${id} not found`);
      }

      if (review.isApproved) {
        throw new BadRequestException('Review is already approved');
      }

      const updatedReview = await this.prisma.review.update({
        where: { id },
        data: { isApproved: true },
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Update product rating statistics
      await this.updateProductRating(review.productId);

      return {
        message: 'Review approved successfully',
        review: updatedReview,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.reviewErrorOptions,
        `Failed to approve review with ID ${id}`,
      );
    }
  }

  // Reject review (admin only)
  async reject(id: string) {
    try {
      const review = await this.prisma.review.findUnique({
        where: { id },
      });

      if (!review) {
        throw new NotFoundException(`Review with ID ${id} not found`);
      }

      await this.prisma.review.delete({
        where: { id },
      });

      // Update product rating statistics
      await this.updateProductRating(review.productId);

      return {
        message: 'Review rejected and deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.reviewErrorOptions,
        `Failed to reject review with ID ${id}`,
      );
    }
  }

  // Toggle review approval (admin only)
  async toggleApproval(id: string) {
    try {
      const review = await this.prisma.review.findUnique({
        where: { id },
      });

      if (!review) {
        throw new NotFoundException(`Review with ID ${id} not found`);
      }

      const updatedReview = await this.prisma.review.update({
        where: { id },
        data: { isApproved: !review.isApproved },
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Update product rating statistics
      await this.updateProductRating(review.productId);

      return {
        message: `Review ${updatedReview.isApproved ? 'approved' : 'unapproved'} successfully`,
        review: updatedReview,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.reviewErrorOptions,
        `Failed to toggle approval for review with ID ${id}`,
      );
    }
  }

  // Delete review
  async remove(id: string, userId: string, isAdmin: boolean = false) {
    try {
      // Check if review exists
      const review = await this.prisma.review.findUnique({
        where: { id },
      });

      if (!review) {
        throw new NotFoundException(`Review with ID ${id} not found`);
      }

      // Only allow user to delete their own reviews, unless admin
      if (!isAdmin && review.userId !== userId) {
        throw new ForbiddenException('You can only delete your own reviews');
      }

      const productId = review.productId;

      await this.prisma.review.delete({
        where: { id },
      });

      // Update product rating statistics
      await this.updateProductRating(productId);

      return {
        message: 'Review deleted successfully',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.reviewErrorOptions,
        `Failed to delete review with ID ${id}`,
      );
    }
  }

  // Update product rating statistics
  private async updateProductRating(productId: string) {
    try {
      const ratingStats = await this.prisma.review.aggregate({
        where: {
          productId,
          isApproved: true,
        },
        _avg: {
          rating: true,
        },
        _count: {
          rating: true,
        },
      });

      await this.prisma.product.update({
        where: { id: productId },
        data: {
          averageRating: ratingStats._avg.rating || 0,
          totalReviews: ratingStats._count.rating || 0,
        },
      });
    } catch (error) {
      console.error(
        `Failed to update product rating for product ${productId}:`,
        error,
      );
    }
  }

  // Get review statistics
  async getStats() {
    try {
      const [
        totalReviews,
        approvedReviews,
        pendingReviews,
        reviewsWithComments,
        ratingStats,
      ] = await Promise.all([
        this.prisma.review.count(),
        this.prisma.review.count({ where: { isApproved: true } }),
        this.prisma.review.count({ where: { isApproved: false } }),
        this.prisma.review.count({ where: { comment: { not: null } } }),
        this.prisma.review.groupBy({
          by: ['rating'],
          _count: {
            _all: true,
          },
          where: { isApproved: true },
        }),
      ]);

      const totalApproved = ratingStats.reduce(
        (sum, item) => sum + item._count._all,
        0,
      );
      const averageRating =
        ratingStats.reduce(
          (sum, item) => sum + item.rating * item._count._all,
          0,
        ) / totalApproved || 0;

      const ratingDistribution = ratingStats.map((item) => ({
        rating: item.rating,
        count: item._count._all,
        percentage:
          totalApproved > 0 ? (item._count._all / totalApproved) * 100 : 0,
      }));

      // Ensure all ratings 1-5 are represented
      for (let i = 1; i <= 5; i++) {
        if (!ratingDistribution.find((item) => item.rating === i)) {
          ratingDistribution.push({
            rating: i,
            count: 0,
            percentage: 0,
          });
        }
      }

      // Sort by rating
      ratingDistribution.sort((a, b) => a.rating - b.rating);

      const stats = {
        totalReviews,
        approvedReviews,
        pendingReviews,
        averageRating: Number(averageRating.toFixed(2)),
        ratingDistribution,
        reviewsWithComments,
      };

      return stats;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.reviewErrorOptions,
        'Failed to fetch review statistics',
      );
    }
  }

  // Get product review statistics
  async getProductReviewStats(productId: string) {
    try {
      // Validate product exists
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      const [ratingStats, approvedReviews] = await Promise.all([
        this.prisma.review.groupBy({
          by: ['rating'],
          _count: {
            _all: true,
          },
          where: {
            productId,
            isApproved: true,
          },
        }),
        this.prisma.review.count({
          where: {
            productId,
            isApproved: true,
          },
        }),
      ]);

      const totalReviews = ratingStats.reduce(
        (sum, item) => sum + item._count._all,
        0,
      );
      const averageRating =
        ratingStats.reduce(
          (sum, item) => sum + item.rating * item._count._all,
          0,
        ) / totalReviews || 0;

      const ratingDistribution = ratingStats.map((item) => ({
        rating: item.rating,
        count: item._count._all,
        percentage:
          totalReviews > 0 ? (item._count._all / totalReviews) * 100 : 0,
      }));

      // Ensure all ratings 1-5 are represented
      for (let i = 1; i <= 5; i++) {
        if (!ratingDistribution.find((item) => item.rating === i)) {
          ratingDistribution.push({
            rating: i,
            count: 0,
            percentage: 0,
          });
        }
      }

      // Sort by rating
      ratingDistribution.sort((a, b) => a.rating - b.rating);

      const stats = {
        productId,
        productName: product.name,
        averageRating: Number(averageRating.toFixed(2)),
        totalReviews,
        ratingDistribution,
        approvedReviews,
      };

      return stats;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.reviewErrorOptions,
        `Failed to fetch review statistics for product ${productId}`,
      );
    }
  }

  // Check if user can review a product (has purchased it)
  async canUserReviewProduct(
    userId: string,
    productId: string,
  ): Promise<boolean> {
    try {
      // Check if user has purchased the product
      const orderWithProduct = await this.prisma.order.findFirst({
        where: {
          userId,
          items: {
            some: {
              productId,
            },
          },
          status: {
            // in: ['DELIVERED', 'COMPLETED'],
          },
        },
      });

      return !!orderWithProduct;
    } catch (error) {
      console.error(`Failed to check if user can review product:`, error);
      return false;
    }
  }

  // Bulk approve reviews (admin only)
  async bulkApprove(ids: string[]) {
    try {
      const result = await this.prisma.review.updateMany({
        where: {
          id: { in: ids },
          isApproved: false,
        },
        data: { isApproved: true },
      });

      // Update product ratings for all affected products
      const affectedProducts = await this.prisma.review.findMany({
        where: {
          id: { in: ids },
        },
        select: {
          productId: true,
        },
        distinct: ['productId'],
      });

      for (const { productId } of affectedProducts) {
        await this.updateProductRating(productId);
      }

      return {
        message: `${result.count} reviews approved successfully`,
        count: result.count,
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.reviewErrorOptions,
        'Failed to bulk approve reviews',
      );
    }
  }
}

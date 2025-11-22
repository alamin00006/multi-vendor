// src/review/review.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
  UseInterceptors,
  ClassSerializerInterceptor,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { QueryReviewDto } from './dto/query-review.dto';
import {
  ReviewResponseDto,
  ReviewWithRelationsResponseDto,
  ReviewListResponseDto,
  ReviewDetailResponseDto,
  ReviewStatsResponseDto,
  ProductReviewStatsResponseDto,
} from './dto/review-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('reviews')
@Controller('reviews')
@UseInterceptors(ClassSerializerInterceptor)
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new review' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Review created successfully',
    type: ReviewDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or product/order does not exist',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot review products from other users orders',
  })
  async create(@Req() req: any, @Body() createReviewDto: CreateReviewDto) {
    const userId = req.user.id;
    const result = await this.reviewService.create(userId, createReviewDto);
    return {
      success: true,
      message: result.message,
      data: result.review,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all reviews with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'orderId', required: false, type: String })
  @ApiQuery({ name: 'rating', required: false, type: Number })
  @ApiQuery({ name: 'isApproved', required: false, type: Boolean })
  @ApiQuery({ name: 'hasComment', required: false, type: Boolean })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'rating', 'updatedAt'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reviews retrieved successfully',
    type: ReviewListResponseDto,
  })
  async findAll(@Query() query: QueryReviewDto) {
    const result = await this.reviewService.findWithQuery(query);

    return {
      success: true,
      data: result.reviews,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  @Get('product/:productId/approved')
  @ApiOperation({
    summary: 'Get approved reviews for a product (public access)',
  })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Approved reviews retrieved successfully',
    type: ReviewListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  async findApprovedByProductId(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('limit') limit?: number,
  ) {
    const reviews = await this.reviewService.findApprovedByProductId(
      productId,
      limit,
    );
    return {
      success: true,
      data: reviews,
    };
  }

  @Get('my-reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user reviews' })
  @ApiQuery({ name: 'includeUnapproved', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User reviews retrieved successfully',
    type: ReviewListResponseDto,
  })
  async findMyReviews(
    @Req() req: any,
    @Query('includeUnapproved') includeUnapproved: boolean = false,
  ) {
    const userId = req.user.id;
    const reviews = await this.reviewService.findByUserId(
      userId,
      includeUnapproved,
    );
    return {
      success: true,
      data: reviews,
    };
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending reviews for moderation (admin only)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pending reviews retrieved successfully',
    type: ReviewListResponseDto,
  })
  async findPending(@Query('limit') limit?: number) {
    const reviews = await this.reviewService.findPending(limit);
    return {
      success: true,
      data: reviews,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a review by ID' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Review retrieved successfully',
    type: ReviewDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Review not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const review = await this.reviewService.findOne(id);
    return {
      success: true,
      data: review,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a review' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Review updated successfully',
    type: ReviewDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Review not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You can only update your own reviews',
  })
  async update(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    const userId = req.user.id;
    const isAdmin = req.user.role === UserRole.ADMIN;
    const result = await this.reviewService.update(
      id,
      userId,
      updateReviewDto,
      isAdmin,
    );
    return {
      success: true,
      message: result.message,
      data: result.review,
    };
  }

  @Put(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a review (admin only)' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Review approved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Review not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Review is already approved',
  })
  async approve(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.reviewService.approve(id);
    return {
      success: true,
      message: result.message,
      data: result.review,
    };
  }

  @Put(':id/toggle-approval')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle review approval status (admin only)' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Review approval status toggled successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Review not found',
  })
  async toggleApproval(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.reviewService.toggleApproval(id);
    return {
      success: true,
      message: result.message,
      data: result.review,
    };
  }

  @Put('bulk/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk approve reviews (admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reviews approved successfully',
  })
  async bulkApprove(@Body('ids') ids: string[]) {
    const result = await this.reviewService.bulkApprove(ids);
    return {
      success: true,
      message: result.message,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a review' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Review deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Review not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You can only delete your own reviews',
  })
  async remove(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const userId = req.user.id;
    const isAdmin = req.user.role === UserRole.ADMIN;
    const result = await this.reviewService.remove(id, userId, isAdmin);
    return {
      success: true,
      message: result.message,
    };
  }

  @Delete(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reject and delete a review (admin only)' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Review rejected successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Review not found',
  })
  async reject(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.reviewService.reject(id);
    return {
      success: true,
      message: result.message,
    };
  }

  @Get('stats/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get review statistics (admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Review statistics retrieved successfully',
    type: ReviewStatsResponseDto,
  })
  async getStats() {
    const stats = await this.reviewService.getStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Get('product/:productId/stats')
  @ApiOperation({ summary: 'Get product review statistics' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product review statistics retrieved successfully',
    type: ProductReviewStatsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  async getProductReviewStats(
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    const stats = await this.reviewService.getProductReviewStats(productId);
    return {
      success: true,
      data: stats,
    };
  }

  @Get('product/:productId/can-review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user can review a product' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Review eligibility check completed',
  })
  async canUserReviewProduct(
    @Req() req: any,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    const userId = req.user.id;
    const canReview = await this.reviewService.canUserReviewProduct(
      userId,
      productId,
    );
    return {
      success: true,
      data: {
        canReview,
        message: canReview
          ? 'User can review this product'
          : 'User cannot review this product',
      },
    };
  }
}

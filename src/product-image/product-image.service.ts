// src/product-image/product-image.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { QueryProductImageDto } from './dto/query-product-image.dto';

@Injectable()
export class ProductImageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  private readonly productImageErrorOptions = {
    entity: 'product image',
    uniqueFieldMap: {},
    foreignKeyMap: {
      productId: 'Product does not exist',
    },
    customMessages: {
      P2003: 'Product does not exist',
    },
  };

  // Create a new product image
  async create(createProductImageDto: CreateProductImageDto) {
    try {
      const { productId, isPrimary, ...imageData } = createProductImageDto;

      // Validate product exists
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        throw new BadRequestException('Product does not exist');
      }

      // If setting as primary, unset other primary images for this product
      if (isPrimary) {
        await this.prisma.productImage.updateMany({
          where: {
            productId,
            isPrimary: true,
          },
          data: { isPrimary: false },
        });
      }

      const productImage = await this.prisma.productImage.create({
        data: {
          ...imageData,
          isPrimary: isPrimary || false,
          productId,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      return {
        message: 'Product image created successfully',
        productImage,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productImageErrorOptions,
        'Failed to create product image',
      );
    }
  }

  // Bulk upload product images
  async bulkCreate(
    productId: string,
    images: Array<{ imageUrl: string; altText?: string; sortOrder?: number }>,
  ) {
    try {
      // Validate product exists
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        throw new BadRequestException('Product does not exist');
      }

      // Get current max sortOrder for this product
      const maxSortOrder = await this.prisma.productImage.aggregate({
        where: { productId },
        _max: {
          sortOrder: true,
        },
      });

      let currentSortOrder = (maxSortOrder._max.sortOrder || 0) + 1;

      const createdImages = [];
      const errors = [];

      //   for (const image of images) {
      //     try {
      //       const productImage = await this.prisma.productImage.create({
      //         data: {
      //           productId,
      //           imageUrl: image.imageUrl,
      //           altText: image.altText || `${product.name} image`,
      //           sortOrder: image.sortOrder || currentSortOrder++,
      //           isPrimary: false, // Don't set as primary in bulk upload
      //         },
      //       }) as any;
      //       createdImages.push(productImage);
      //     } catch (error) {
      //       errors.push({
      //         imageUrl: image.imageUrl,
      //         error: error.message,
      //       });
      //     }
      //   }

      return {
        message: `Bulk image upload completed. ${createdImages.length} images uploaded, ${errors.length} failed.`,
        data: {
          uploaded: createdImages.length,
          failed: errors.length,
          images: createdImages,
          errors,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productImageErrorOptions,
        'Failed to bulk upload product images',
      );
    }
  }

  // Get all product images with filtering
  async findAll(query?: QueryProductImageDto) {
    try {
      const where: Prisma.ProductImageWhereInput = {};

      if (query?.productId) {
        where.productId = query.productId;
      }

      if (query?.isPrimary !== undefined) {
        where.isPrimary = query.isPrimary;
      }

      const productImages = await this.prisma.productImage.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: [
          { isPrimary: 'desc' },
          { sortOrder: 'asc' },
          { createdAt: 'asc' },
        ],
      });

      return productImages;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productImageErrorOptions,
        'Failed to fetch product images',
      );
    }
  }

  // Get images for a specific product
  async findByProductId(productId: string) {
    try {
      // Validate product exists
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      const productImages = await this.prisma.productImage.findMany({
        where: { productId },
        orderBy: [
          { isPrimary: 'desc' },
          { sortOrder: 'asc' },
          { createdAt: 'asc' },
        ],
      });

      return productImages;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productImageErrorOptions,
        `Failed to fetch images for product ${productId}`,
      );
    }
  }

  // Get primary image for a product
  async findPrimaryByProductId(productId: string) {
    try {
      const primaryImage = await this.prisma.productImage.findFirst({
        where: {
          productId,
          isPrimary: true,
        },
      });

      return primaryImage;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productImageErrorOptions,
        `Failed to fetch primary image for product ${productId}`,
      );
    }
  }

  // Get a single product image by ID
  async findOne(id: string) {
    try {
      const productImage = await this.prisma.productImage.findUnique({
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
        },
      });

      if (!productImage) {
        throw new NotFoundException(`Product image with ID ${id} not found`);
      }

      return productImage;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productImageErrorOptions,
        `Failed to fetch product image with ID ${id}`,
      );
    }
  }

  // Update product image
  async update(id: string, updateProductImageDto: UpdateProductImageDto) {
    try {
      // Check if image exists
      const imageExists = await this.prisma.productImage.findUnique({
        where: { id },
      });

      if (!imageExists) {
        throw new NotFoundException(`Product image with ID ${id} not found`);
      }

      const { isPrimary, ...updateData } = updateProductImageDto;

      // If setting as primary, unset other primary images for this product
      if (isPrimary) {
        await this.prisma.productImage.updateMany({
          where: {
            productId: imageExists.productId,
            isPrimary: true,
            id: { not: id },
          },
          data: { isPrimary: false },
        });
      }

      const updatedImage = await this.prisma.productImage.update({
        where: { id },
        data: {
          ...updateData,
          ...(isPrimary !== undefined && { isPrimary }),
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      // Update product's featuredImageUrl if this is the primary image
      if (isPrimary) {
        await this.prisma.product.update({
          where: { id: imageExists.productId },
          data: { featuredImageUrl: updatedImage.imageUrl },
        });
      }

      return {
        message: 'Product image updated successfully',
        productImage: updatedImage,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productImageErrorOptions,
        `Failed to update product image with ID ${id}`,
      );
    }
  }

  // Set image as primary
  async setAsPrimary(id: string) {
    try {
      const image = await this.prisma.productImage.findUnique({
        where: { id },
      });

      if (!image) {
        throw new NotFoundException(`Product image with ID ${id} not found`);
      }

      // Unset other primary images for this product
      await this.prisma.productImage.updateMany({
        where: {
          productId: image.productId,
          isPrimary: true,
          id: { not: id },
        },
        data: { isPrimary: false },
      });

      // Set this image as primary
      const updatedImage = await this.prisma.productImage.update({
        where: { id },
        data: { isPrimary: true },
      });

      // Update product's featuredImageUrl
      await this.prisma.product.update({
        where: { id: image.productId },
        data: { featuredImageUrl: updatedImage.imageUrl },
      });

      return {
        message: 'Image set as primary successfully',
        productImage: updatedImage,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productImageErrorOptions,
        `Failed to set image ${id} as primary`,
      );
    }
  }

  // Reorder images for a product
  async reorder(
    productId: string,
    imageOrder: Array<{ id: string; sortOrder: number }>,
  ) {
    try {
      // Validate product exists
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        throw new BadRequestException('Product does not exist');
      }

      // Validate all images belong to the product
      const imageIds = imageOrder.map((item) => item.id);
      const existingImages = await this.prisma.productImage.findMany({
        where: {
          id: { in: imageIds },
          productId,
        },
        select: { id: true },
      });

      if (existingImages.length !== imageIds.length) {
        throw new BadRequestException(
          'Some images do not belong to the specified product',
        );
      }

      const transactions = imageOrder.map((item) =>
        this.prisma.productImage.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      );

      await this.prisma.$transaction(transactions);

      return {
        message: 'Images reordered successfully',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productImageErrorOptions,
        'Failed to reorder product images',
      );
    }
  }

  // Delete product image
  async remove(id: string) {
    try {
      // Check if image exists
      const image = await this.prisma.productImage.findUnique({
        where: { id },
        include: {
          product: {
            select: {
              id: true,
              featuredImageUrl: true,
            },
          },
        },
      });

      if (!image) {
        throw new NotFoundException(`Product image with ID ${id} not found`);
      }

      // Check if this is the primary image
      const isPrimary = image.isPrimary;

      await this.prisma.productImage.delete({
        where: { id },
      });

      // If this was the primary image, set a new primary image or update product's featuredImageUrl
      if (isPrimary) {
        const newPrimary = await this.prisma.productImage.findFirst({
          where: {
            productId: image.product.id,
            id: { not: id },
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        });

        if (newPrimary) {
          await this.prisma.productImage.update({
            where: { id: newPrimary.id },
            data: { isPrimary: true },
          });

          await this.prisma.product.update({
            where: { id: image.product.id },
            data: { featuredImageUrl: newPrimary.imageUrl },
          });
        } else {
          // No images left, clear featuredImageUrl
          await this.prisma.product.update({
            where: { id: image.product.id },
            data: { featuredImageUrl: null },
          });
        }
      }

      return {
        message: 'Product image deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productImageErrorOptions,
        `Failed to delete product image with ID ${id}`,
      );
    }
  }

  // Delete all images for a product
  async removeAllByProduct(productId: string) {
    try {
      // Validate product exists
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      const result = await this.prisma.productImage.deleteMany({
        where: { productId },
      });

      // Clear product's featuredImageUrl
      await this.prisma.product.update({
        where: { id: productId },
        data: { featuredImageUrl: null },
      });

      return {
        message: `All ${result.count} images deleted successfully for product ${productId}`,
        count: result.count,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productImageErrorOptions,
        `Failed to delete images for product ${productId}`,
      );
    }
  }

  // Get image count for a product
  async getImageCount(productId: string) {
    try {
      const count = await this.prisma.productImage.count({
        where: { productId },
      });

      return { count };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productImageErrorOptions,
        `Failed to get image count for product ${productId}`,
      );
    }
  }
}

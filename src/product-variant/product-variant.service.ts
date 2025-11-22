// src/product-variant/product-variant.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { QueryProductVariantDto } from './dto/query-product-variant.dto';
import { BulkUpdateVariantStockDto } from './dto/bulk-update-variant-stock.dto';

@Injectable()
export class ProductVariantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  private readonly productVariantErrorOptions = {
    entity: 'product variant',
    uniqueFieldMap: {
      sku: 'Variant SKU already exists',
    },
    foreignKeyMap: {
      productId: 'Product does not exist',
    },
    customMessages: {
      P2003: 'Product does not exist',
    },
  };

  // Calculate current price for variant
  private calculateCurrentPrice(
    productBasePrice: number,
    priceAdjustment: number,
  ): number {
    return productBasePrice + priceAdjustment;
  }

  // Check if variant is low stock
  private isLowStock(
    stockQuantity: number,
    lowStockThreshold: number,
  ): boolean {
    return stockQuantity > 0 && stockQuantity <= lowStockThreshold;
  }

  // Check if variant is out of stock
  private isOutOfStock(stockQuantity: number): boolean {
    return stockQuantity <= 0;
  }

  // Create a new product variant
  async create(createProductVariantDto: CreateProductVariantDto) {
    try {
      const { productId, ...variantData } = createProductVariantDto;

      // Validate product exists and has variants enabled
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        throw new BadRequestException('Product does not exist');
      }

      if (!product.hasVariants) {
        throw new BadRequestException('Product does not have variants enabled');
      }

      const productVariant = await this.prisma.productVariant.create({
        data: {
          ...variantData,
          productId,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              basePrice: true,
              featuredImageUrl: true,
            },
          },
        },
      });

      // Calculate additional fields for response
      const currentPrice = this.calculateCurrentPrice(
        product.basePrice,
        productVariant.priceAdjustment,
      );
      const isLowStock = this.isLowStock(
        productVariant.stockQuantity,
        productVariant.lowStockThreshold,
      );
      const isOutOfStock = this.isOutOfStock(productVariant.stockQuantity);

      const variantWithDetails = {
        ...productVariant,
        currentPrice,
        isLowStock,
        isOutOfStock,
      };

      return {
        message: 'Product variant created successfully',
        productVariant: variantWithDetails,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productVariantErrorOptions,
        'Failed to create product variant',
      );
    }
  }

  // Get all product variants with filtering
  async findAll(query?: QueryProductVariantDto) {
    try {
      const where: Prisma.ProductVariantWhereInput = {};

      if (query?.productId) {
        where.productId = query.productId;
      }

      if (query?.isActive !== undefined) {
        where.isActive = query.isActive;
      }

      if (query?.inStock !== undefined) {
        if (query.inStock) {
          where.stockQuantity = { gt: 0 };
        } else {
          where.stockQuantity = { lte: 0 };
        }
      }

      const productVariants = await this.prisma.productVariant.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              basePrice: true,
              featuredImageUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      // Add calculated fields
      const variantsWithDetails = productVariants.map((variant) => ({
        ...variant,
        currentPrice: this.calculateCurrentPrice(
          variant.product.basePrice,
          variant.priceAdjustment,
        ),
        isLowStock: this.isLowStock(
          variant.stockQuantity,
          variant.lowStockThreshold,
        ),
        isOutOfStock: this.isOutOfStock(variant.stockQuantity),
      }));

      return variantsWithDetails;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productVariantErrorOptions,
        'Failed to fetch product variants',
      );
    }
  }

  // Get variants for a specific product
  async findByProductId(productId: string, includeInactive: boolean = false) {
    try {
      // Validate product exists
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      const where: Prisma.ProductVariantWhereInput = { productId };
      if (!includeInactive) {
        where.isActive = true;
      }

      const productVariants = await this.prisma.productVariant.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              basePrice: true,
              featuredImageUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      // Add calculated fields
      const variantsWithDetails = productVariants.map((variant) => ({
        ...variant,
        currentPrice: this.calculateCurrentPrice(
          variant.product.basePrice,
          variant.priceAdjustment,
        ),
        isLowStock: this.isLowStock(
          variant.stockQuantity,
          variant.lowStockThreshold,
        ),
        isOutOfStock: this.isOutOfStock(variant.stockQuantity),
      }));

      return variantsWithDetails;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productVariantErrorOptions,
        `Failed to fetch variants for product ${productId}`,
      );
    }
  }

  // Get active variants for a product
  async findActiveByProductId(productId: string) {
    try {
      const variants = await this.findByProductId(productId, false);
      return variants;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productVariantErrorOptions,
        `Failed to fetch active variants for product ${productId}`,
      );
    }
  }

  // Get a single product variant by ID
  async findOne(id: string) {
    try {
      const productVariant = await this.prisma.productVariant.findUnique({
        where: { id },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              basePrice: true,
              featuredImageUrl: true,
              isPublished: true,
            },
          },
          _count: {
            select: {
              cartItems: true,
              orderItems: true,
            },
          },
        },
      });

      if (!productVariant) {
        throw new NotFoundException(`Product variant with ID ${id} not found`);
      }

      // Add calculated fields
      const variantWithDetails = {
        ...productVariant,
        currentPrice: this.calculateCurrentPrice(
          productVariant.product.basePrice,
          productVariant.priceAdjustment,
        ),
        isLowStock: this.isLowStock(
          productVariant.stockQuantity,
          productVariant.lowStockThreshold,
        ),
        isOutOfStock: this.isOutOfStock(productVariant.stockQuantity),
      };

      return variantWithDetails;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productVariantErrorOptions,
        `Failed to fetch product variant with ID ${id}`,
      );
    }
  }

  // Get variant by SKU
  async findBySku(sku: string) {
    try {
      const productVariant = await this.prisma.productVariant.findUnique({
        where: { sku },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              basePrice: true,
              featuredImageUrl: true,
              isPublished: true,
            },
          },
        },
      });

      if (!productVariant) {
        throw new NotFoundException(
          `Product variant with SKU ${sku} not found`,
        );
      }

      // Add calculated fields
      const variantWithDetails = {
        ...productVariant,
        currentPrice: this.calculateCurrentPrice(
          productVariant.product.basePrice,
          productVariant.priceAdjustment,
        ),
        isLowStock: this.isLowStock(
          productVariant.stockQuantity,
          productVariant.lowStockThreshold,
        ),
        isOutOfStock: this.isOutOfStock(productVariant.stockQuantity),
      };

      return variantWithDetails;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productVariantErrorOptions,
        `Failed to fetch product variant with SKU ${sku}`,
      );
    }
  }

  // Update product variant
  async update(id: string, updateProductVariantDto: UpdateProductVariantDto) {
    try {
      // Check if variant exists
      const variantExists = await this.prisma.productVariant.findUnique({
        where: { id },
        include: {
          product: {
            select: {
              basePrice: true,
            },
          },
        },
      });

      if (!variantExists) {
        throw new NotFoundException(`Product variant with ID ${id} not found`);
      }

      const updatedVariant = await this.prisma.productVariant.update({
        where: { id },
        data: updateProductVariantDto,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              basePrice: true,
              featuredImageUrl: true,
            },
          },
        },
      });

      // Add calculated fields
      const variantWithDetails = {
        ...updatedVariant,
        currentPrice: this.calculateCurrentPrice(
          updatedVariant.product.basePrice,
          updatedVariant.priceAdjustment,
        ),
        isLowStock: this.isLowStock(
          updatedVariant.stockQuantity,
          updatedVariant.lowStockThreshold,
        ),
        isOutOfStock: this.isOutOfStock(updatedVariant.stockQuantity),
      };

      return {
        message: 'Product variant updated successfully',
        productVariant: variantWithDetails,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productVariantErrorOptions,
        `Failed to update product variant with ID ${id}`,
      );
    }
  }

  // Toggle variant active status
  async toggleActive(id: string) {
    try {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id },
        include: {
          product: {
            select: {
              basePrice: true,
            },
          },
        },
      });

      if (!variant) {
        throw new NotFoundException(`Product variant with ID ${id} not found`);
      }

      const updatedVariant = await this.prisma.productVariant.update({
        where: { id },
        data: { isActive: !variant.isActive },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              basePrice: true,
              featuredImageUrl: true,
            },
          },
        },
      });

      // Add calculated fields
      const variantWithDetails = {
        ...updatedVariant,
        currentPrice: this.calculateCurrentPrice(
          updatedVariant.product.basePrice,
          updatedVariant.priceAdjustment,
        ),
        isLowStock: this.isLowStock(
          updatedVariant.stockQuantity,
          updatedVariant.lowStockThreshold,
        ),
        isOutOfStock: this.isOutOfStock(updatedVariant.stockQuantity),
      };

      return {
        message: `Product variant ${updatedVariant.isActive ? 'activated' : 'deactivated'} successfully`,
        productVariant: variantWithDetails,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productVariantErrorOptions,
        `Failed to toggle active status for variant with ID ${id}`,
      );
    }
  }

  // Update variant stock
  async updateStock(id: string, stockQuantity: number) {
    try {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id },
        include: {
          product: {
            select: {
              basePrice: true,
            },
          },
        },
      });

      if (!variant) {
        throw new NotFoundException(`Product variant with ID ${id} not found`);
      }

      const updatedVariant = await this.prisma.productVariant.update({
        where: { id },
        data: { stockQuantity },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              basePrice: true,
              featuredImageUrl: true,
            },
          },
        },
      });

      // Add calculated fields
      const variantWithDetails = {
        ...updatedVariant,
        currentPrice: this.calculateCurrentPrice(
          updatedVariant.product.basePrice,
          updatedVariant.priceAdjustment,
        ),
        isLowStock: this.isLowStock(
          updatedVariant.stockQuantity,
          updatedVariant.lowStockThreshold,
        ),
        isOutOfStock: this.isOutOfStock(updatedVariant.stockQuantity),
      };

      return {
        message: 'Product variant stock updated successfully',
        productVariant: variantWithDetails,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productVariantErrorOptions,
        `Failed to update stock for variant with ID ${id}`,
      );
    }
  }

  // Bulk update variant stock
  async bulkUpdateStock(bulkUpdateVariantStockDto: BulkUpdateVariantStockDto) {
    try {
      const { updates } = bulkUpdateVariantStockDto;
      const results = [];
      let updatedCount = 0;
      let failedCount = 0;

      //   for (const update of updates) {
      //     try {
      //       const variant = await this.prisma.productVariant.findUnique({
      //         where: { id: update.variantId },
      //       });

      //       if (!variant) {
      //         throw new NotFoundException(`Variant with ID ${update.variantId} not found`);
      //       }

      //       await this.prisma.productVariant.update({
      //         where: { id: update.variantId },
      //         data: { stockQuantity: update.stockQuantity },
      //       });

      //       results.push({
      //         variantId: update.variantId,
      //         success: true,
      //         message: 'Stock updated successfully',
      //       });
      //       updatedCount++;
      //     } catch (error) {
      //       results.push({
      //         variantId: update.variantId,
      //         success: false,
      //         message: error.message,
      //       });
      //       failedCount++;
      //     }
      //   }

      return {
        message: `Bulk stock update completed. ${updatedCount} updated, ${failedCount} failed.`,
        data: {
          updated: updatedCount,
          failed: failedCount,
          results,
        },
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productVariantErrorOptions,
        'Failed to bulk update variant stock',
      );
    }
  }

  // Delete product variant
  async remove(id: string) {
    try {
      // Check if variant exists
      const variant = await this.prisma.productVariant.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              cartItems: true,
              orderItems: true,
            },
          },
        },
      });

      if (!variant) {
        throw new NotFoundException(`Product variant with ID ${id} not found`);
      }

      // Check if variant has associated cart items or order items
      if (variant._count.cartItems > 0 || variant._count.orderItems > 0) {
        throw new BadRequestException(
          'Cannot delete variant with associated cart items or order items. Please deactivate the variant instead.',
        );
      }

      await this.prisma.productVariant.delete({
        where: { id },
      });

      return {
        message: 'Product variant deleted successfully',
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
        this.productVariantErrorOptions,
        `Failed to delete product variant with ID ${id}`,
      );
    }
  }

  // Get variant stock information
  async getStockInfo(id: string) {
    try {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id },
        select: {
          id: true,
          sku: true,
          stockQuantity: true,
          lowStockThreshold: true,
        },
      });

      if (!variant) {
        throw new NotFoundException(`Product variant with ID ${id} not found`);
      }

      const stockInfo = {
        variantId: variant.id,
        sku: variant.sku,
        stockQuantity: variant.stockQuantity,
        lowStockThreshold: variant.lowStockThreshold,
        isLowStock: this.isLowStock(
          variant.stockQuantity,
          variant.lowStockThreshold,
        ),
        isOutOfStock: this.isOutOfStock(variant.stockQuantity),
      };

      return stockInfo;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productVariantErrorOptions,
        `Failed to fetch stock info for variant with ID ${id}`,
      );
    }
  }

  // Get low stock variants
  async findLowStock() {
    try {
      const lowStockVariants = await this.prisma.productVariant.findMany({
        where: {
          stockQuantity: {
            lte: this.prisma.productVariant.fields.lowStockThreshold,
            gt: 0,
          },
          isActive: true,
        },
        include: {
          product: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { stockQuantity: 'asc' },
      });

      return lowStockVariants;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productVariantErrorOptions,
        'Failed to fetch low stock variants',
      );
    }
  }

  // Get out of stock variants
  async findOutOfStock() {
    try {
      const outOfStockVariants = await this.prisma.productVariant.findMany({
        where: {
          stockQuantity: { lte: 0 },
          isActive: true,
        },
        include: {
          product: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return outOfStockVariants;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productVariantErrorOptions,
        'Failed to fetch out of stock variants',
      );
    }
  }

  // Check if combination of variant attributes already exists for a product
  async checkVariantCombination(
    productId: string,
    variantAttributes: any,
  ): Promise<boolean> {
    try {
      const existingVariant = await this.prisma.productVariant.findFirst({
        where: {
          productId,
          variantAttributes,
        },
      });

      return !!existingVariant;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productVariantErrorOptions,
        'Failed to check variant combination',
      );
    }
  }
}

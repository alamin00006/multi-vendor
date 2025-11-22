// src/product/product.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto, ProductSortBy } from './dto/query-product.dto';

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  private readonly productErrorOptions = {
    entity: 'product',
    uniqueFieldMap: {
      name: 'Product name already exists',
      slug: 'Product slug already exists',
      sku: 'Product SKU already exists',
    },
    foreignKeyMap: {
      categoryId: 'Category does not exist',
      brandId: 'Brand does not exist',
    },
    customMessages: {
      P2003: 'Related category or brand does not exist',
    },
  };

  // Generate slug from name
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Create a new product
  async create(createProductDto: CreateProductDto) {
    try {
      const { name, slug, categoryId, brandId, ...productData } =
        createProductDto;

      const productSlug = slug || this.generateSlug(name);

      // Validate category and brand
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        throw new BadRequestException('Category does not exist');
      }

      if (brandId) {
        const brand = await this.prisma.brand.findUnique({
          where: { id: brandId },
        });
        if (!brand) {
          throw new BadRequestException('Brand does not exist');
        }
      }

      const product = await this.prisma.product.create({
        data: {
          name,
          slug: productSlug,
          categoryId,
          brandId,
          ...productData,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          images: {
            orderBy: { sortOrder: 'asc' },
          },
          _count: {
            select: {
              reviews: true,
              variants: true,
              wishlists: true,
            },
          },
        },
      });

      return {
        message: 'Product created successfully',
        product,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productErrorOptions,
        'Failed to create product',
      );
    }
  }

  // Get all products with pagination and filtering
  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.ProductWhereInput;
    orderBy?: Prisma.ProductOrderByWithRelationInput;
    include?: Prisma.ProductInclude;
  }) {
    try {
      const { skip, take, where, orderBy, include } = params || {};

      const defaultInclude: Prisma.ProductInclude = {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          where: { isPrimary: true },
          take: 1,
        },
        _count: {
          select: {
            reviews: true,
            variants: true,
          },
        },
      };

      const products = await this.prisma.product.findMany({
        skip,
        take,
        where,
        include: include || defaultInclude,
        orderBy: orderBy || { createdAt: 'desc' },
      });

      return products;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productErrorOptions,
        'Failed to fetch products',
      );
    }
  }

  // Get products with query parameters
  async findWithQuery(query: QueryProductDto) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        categoryId,
        brandId,
        isPublished,
        isFeatured,
        hasVariants,
        minPrice,
        maxPrice,
        inStock,
        sortBy = ProductSortBy.CREATED_AT,
        sortOrder = 'desc',
        includeCategory = true,
        includeBrand = true,
        includeImages = true,
        includeReviews = false,
      } = query;

      const skip = (page - 1) * limit;
      const where: Prisma.ProductWhereInput = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { shortDescription: { contains: search, mode: 'insensitive' } },
          { longDescription: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (categoryId) {
        where.categoryId = categoryId;
      }

      if (brandId) {
        where.brandId = brandId;
      }

      if (isPublished !== undefined) {
        where.isPublished = isPublished;
      }

      if (isFeatured !== undefined) {
        where.isFeatured = isFeatured;
      }

      if (hasVariants !== undefined) {
        where.hasVariants = hasVariants;
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        where.OR = [
          {
            salePrice: {
              gte: minPrice,
              lte: maxPrice,
            },
          },
          {
            AND: [
              { salePrice: null },
              { basePrice: { gte: minPrice, lte: maxPrice } },
            ],
          },
        ];
      }

      if (inStock !== undefined) {
        if (inStock) {
          where.stockQuantity = { gt: 0 };
        } else {
          where.stockQuantity = { lte: 0 };
        }
      }

      // Build include object based on query parameters
      const include: Prisma.ProductInclude = {
        _count: {
          select: {
            reviews: true,
            variants: true,
            wishlists: true,
          },
        },
      };

      if (includeCategory) {
        include.category = {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        };
      }

      if (includeBrand) {
        include.brand = {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        };
      }

      if (includeImages) {
        include.images = {
          where: { isPrimary: true },
          take: 1,
        };
      }

      if (includeReviews) {
        include.reviews = {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        };
      }

      // Build orderBy based on sortBy and sortOrder
      let orderBy: Prisma.ProductOrderByWithRelationInput;
      switch (sortBy) {
        case ProductSortBy.NAME:
          orderBy = { name: sortOrder };
          break;
        case ProductSortBy.PRICE:
          orderBy = { basePrice: sortOrder };
          break;
        case ProductSortBy.RATING:
          orderBy = { averageRating: sortOrder };
          break;
        case ProductSortBy.POPULARITY:
          orderBy = { totalReviews: sortOrder };
          break;
        case ProductSortBy.UPDATED_AT:
          orderBy = { updatedAt: sortOrder };
          break;
        default:
          orderBy = { createdAt: sortOrder };
      }

      const [products, total] = await Promise.all([
        this.prisma.product.findMany({
          skip,
          take: limit,
          where,
          include,
          orderBy,
        }),
        this.prisma.product.count({ where }),
      ]);

      return {
        products,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productErrorOptions,
        'Failed to fetch products with query',
      );
    }
  }

  // Get published products (for public access)
  async findPublished(query: Omit<QueryProductDto, 'isPublished'>) {
    try {
      const result = await this.findWithQuery({
        ...query,
        isPublished: true,
      });
      return result;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productErrorOptions,
        'Failed to fetch published products',
      );
    }
  }

  // Get featured products
  async findFeatured(limit: number = 10) {
    try {
      const products = await this.prisma.product.findMany({
        where: {
          isFeatured: true,
          isPublished: true,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          images: {
            where: { isPrimary: true },
            take: 1,
          },
          _count: {
            select: {
              reviews: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return products;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productErrorOptions,
        'Failed to fetch featured products',
      );
    }
  }

  // Get a single product by ID
  async findOne(id: string) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          images: {
            orderBy: { sortOrder: 'asc' },
          },
          variants: {
            where: { isActive: true },
            orderBy: { createdAt: 'asc' },
          },
          reviews: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              reviews: true,
              variants: true,
              wishlists: true,
            },
          },
        },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      return product;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productErrorOptions,
        `Failed to fetch product with ID ${id}`,
      );
    }
  }

  // Get product by slug
  async findBySlug(slug: string) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { slug },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          images: {
            orderBy: { sortOrder: 'asc' },
          },
          variants: {
            where: { isActive: true },
            orderBy: { createdAt: 'asc' },
          },
          reviews: {
            where: { isApproved: true },
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              reviews: true,
              variants: true,
              wishlists: true,
            },
          },
        },
      });

      if (!product) {
        throw new NotFoundException(`Product with slug ${slug} not found`);
      }

      return product;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productErrorOptions,
        `Failed to fetch product with slug ${slug}`,
      );
    }
  }

  // Update product details
  async update(id: string, updateProductDto: UpdateProductDto) {
    try {
      // Check if product exists
      const productExists = await this.prisma.product.findUnique({
        where: { id },
      });

      if (!productExists) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      const { name, slug, categoryId, brandId, ...updateData } =
        updateProductDto;

      // Validate category and brand if provided
      if (categoryId) {
        const category = await this.prisma.category.findUnique({
          where: { id: categoryId },
        });
        if (!category) {
          throw new BadRequestException('Category does not exist');
        }
      }

      if (brandId) {
        const brand = await this.prisma.brand.findUnique({
          where: { id: brandId },
        });
        if (!brand) {
          throw new BadRequestException('Brand does not exist');
        }
      }

      // Generate slug if name is updated and slug is not provided
      let productSlug = slug;
      if (name && !slug) {
        productSlug = this.generateSlug(name);
      }

      const finalUpdateData: Prisma.ProductUpdateInput = { ...updateData };
      if (name) finalUpdateData.name = name;
      if (productSlug) finalUpdateData.slug = productSlug;
      //   if (categoryId) finalUpdateData.categoryId = categoryId;
      //   if (brandId !== undefined) finalUpdateData.brandId = brandId;

      const updatedProduct = await this.prisma.product.update({
        where: { id },
        data: finalUpdateData,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              reviews: true,
              variants: true,
            },
          },
        },
      });

      return {
        message: 'Product updated successfully',
        product: updatedProduct,
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
        this.productErrorOptions,
        `Failed to update product with ID ${id}`,
      );
    }
  }

  // Toggle product published status
  async togglePublished(id: string) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      const updatedProduct = await this.prisma.product.update({
        where: { id },
        data: { isPublished: !product.isPublished },
      });

      return {
        message: `Product ${updatedProduct.isPublished ? 'published' : 'unpublished'} successfully`,
        product: updatedProduct,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productErrorOptions,
        `Failed to toggle published status for product with ID ${id}`,
      );
    }
  }

  // Toggle product featured status
  async toggleFeatured(id: string) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      const updatedProduct = await this.prisma.product.update({
        where: { id },
        data: { isFeatured: !product.isFeatured },
      });

      return {
        message: `Product ${updatedProduct.isFeatured ? 'added to' : 'removed from'} featured successfully`,
        product: updatedProduct,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productErrorOptions,
        `Failed to toggle featured status for product with ID ${id}`,
      );
    }
  }

  // Update product stock
  async updateStock(id: string, stockQuantity: number) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      const updatedProduct = await this.prisma.product.update({
        where: { id },
        data: { stockQuantity },
      });

      return {
        message: 'Product stock updated successfully',
        product: updatedProduct,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productErrorOptions,
        `Failed to update stock for product with ID ${id}`,
      );
    }
  }

  // Delete product
  async remove(id: string) {
    try {
      // Check if product exists
      const product = await this.prisma.product.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              //   orders: true,
              reviews: true,
              wishlists: true,
            },
          },
        },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      // Check if product has orders
      //   if (product._count.orders > 0) {
      //     throw new BadRequestException(
      //       'Cannot delete product with associated orders. Please archive the product instead.',
      //     );
      //   }

      await this.prisma.product.delete({
        where: { id },
      });

      return {
        message: 'Product deleted successfully',
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
        this.productErrorOptions,
        `Failed to delete product with ID ${id}`,
      );
    }
  }

  // Get product statistics
  async getStats() {
    try {
      const [
        totalProducts,
        publishedProducts,
        featuredProducts,
        outOfStockProducts,
        lowStockProducts,
        productsWithVariants,
      ] = await Promise.all([
        this.prisma.product.count(),
        this.prisma.product.count({ where: { isPublished: true } }),
        this.prisma.product.count({ where: { isFeatured: true } }),
        this.prisma.product.count({ where: { stockQuantity: 0 } }),
        this.prisma.product.count({
          where: {
            stockQuantity: {
              lte: this.prisma.product.fields.lowStockThreshold,
              gt: 0,
            },
          },
        }),
        this.prisma.product.count({ where: { hasVariants: true } }),
      ]);

      // Calculate total inventory value and average price
      const inventoryStats = await this.prisma.product.aggregate({
        _sum: {
          stockQuantity: true,
          costPrice: true,
        },
        _avg: {
          basePrice: true,
        },
        where: {
          isPublished: true,
        },
      });

      const stats = {
        totalProducts,
        publishedProducts,
        featuredProducts,
        outOfStockProducts,
        lowStockProducts,
        productsWithVariants,
        totalInventoryValue: inventoryStats._sum.costPrice || 0,
        averageProductPrice: inventoryStats._avg.basePrice || 0,
        totalStockQuantity: inventoryStats._sum.stockQuantity || 0,
      };

      return stats;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productErrorOptions,
        'Failed to fetch product statistics',
      );
    }
  }

  // Get low stock products
  async findLowStock() {
    try {
      const products = await this.prisma.product.findMany({
        where: {
          stockQuantity: {
            lte: this.prisma.product.fields.lowStockThreshold,
            gt: 0,
          },
          isPublished: true,
        },
        include: {
          category: {
            select: {
              name: true,
            },
          },
          brand: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { stockQuantity: 'asc' },
      });

      return products;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productErrorOptions,
        'Failed to fetch low stock products',
      );
    }
  }

  // Update product rating (called when reviews are added/updated)
  async updateProductRating(productId: string) {
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

      return {
        averageRating: ratingStats._avg.rating || 0,
        totalReviews: ratingStats._count.rating || 0,
      };
    } catch (error) {
      console.error(`Failed to update rating for product ${productId}:`, error);
    }
  }
}

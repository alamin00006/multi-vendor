import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { QueryBrandDto } from './dto/query-brand.dto';

@Injectable()
export class BrandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  // Brand-specific error configuration
  private readonly brandErrorOptions = {
    entity: 'brand',
    uniqueFieldMap: {
      name: 'Brand name already exists',
      slug: 'Brand slug already exists',
    },
    foreignKeyMap: {},
    customMessages: {
      P2003: 'Related record not found',
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

  // Create a new brand
  async create(createBrandDto: CreateBrandDto) {
    try {
      const { name, slug, ...restData } = createBrandDto;

      const brandSlug = slug || this.generateSlug(name);

      const brand = await this.prisma.brand.create({
        data: {
          name,
          slug: brandSlug,
          ...restData,
        },
      });

      return {
        message: 'Brand created successfully',
        brand,
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.brandErrorOptions,
        'Failed to create brand',
      );
    }
  }

  // Get all brands with optional filtering and pagination
  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.BrandWhereInput;
    orderBy?: Prisma.BrandOrderByWithRelationInput;
  }) {
    try {
      const { skip, take, where, orderBy } = params || {};

      const brands = await this.prisma.brand.findMany({
        skip,
        take,
        where,
        include: {
          products: {
            where: { isPublished: true },
            select: {
              id: true,
              name: true,
              featuredImageUrl: true,
              basePrice: true,
              salePrice: true,
            },
          },
          _count: {
            select: {
              products: {
                where: { isPublished: true },
              },
            },
          },
        },
        orderBy: orderBy || { sortOrder: 'asc', name: 'asc' },
      });

      return brands;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.brandErrorOptions,
        'Failed to fetch brands',
      );
    }
  }

  // Get brands with query parameters
  async findWithQuery(query: QueryBrandDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        isFeatured,
        isActive,
        sortBy = 'sortOrder',
        sortOrder = 'asc',
      } = query;

      const skip = (page - 1) * limit;
      const where: Prisma.BrandWhereInput = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (isFeatured !== undefined) {
        where.isFeatured = isFeatured;
      }

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      const [brands, total] = await Promise.all([
        this.prisma.brand.findMany({
          skip,
          take: limit,
          where,
          include: {
            _count: {
              select: {
                products: {
                  where: { isPublished: true },
                },
              },
            },
          },
          orderBy: { [sortBy]: sortOrder },
        }),
        this.prisma.brand.count({ where }),
      ]);

      return {
        brands,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.brandErrorOptions,
        'Failed to fetch brands with query',
      );
    }
  }

  // Get active brands only
  async findActive() {
    try {
      return await this.prisma.brand.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: {
              products: {
                where: { isPublished: true },
              },
            },
          },
        },
        orderBy: { sortOrder: 'asc', name: 'asc' },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.brandErrorOptions,
        'Failed to fetch active brands',
      );
    }
  }

  // Get featured brands
  async findFeatured() {
    try {
      return await this.prisma.brand.findMany({
        where: {
          isFeatured: true,
          isActive: true,
        },
        include: {
          _count: {
            select: {
              products: {
                where: { isPublished: true },
              },
            },
          },
        },
        orderBy: { sortOrder: 'asc', name: 'asc' },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.brandErrorOptions,
        'Failed to fetch featured brands',
      );
    }
  }

  // Get a single brand by ID
  async findOne(id: string) {
    try {
      const brand = await this.prisma.brand.findUnique({
        where: { id },
        include: {
          products: {
            where: { isPublished: true },
            include: {
              category: {
                select: { name: true, slug: true },
              },
              images: {
                where: { isPrimary: true },
                take: 1,
              },
              _count: {
                select: { reviews: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              products: {
                where: { isPublished: true },
              },
            },
          },
        },
      });

      if (!brand) {
        throw new NotFoundException(`Brand with ID ${id} not found`);
      }

      return brand;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.brandErrorOptions,
        `Failed to fetch brand with ID ${id}`,
      );
    }
  }

  // Get brand by slug
  async findBySlug(slug: string) {
    try {
      const brand = await this.prisma.brand.findUnique({
        where: { slug },
        include: {
          products: {
            where: { isPublished: true },
            include: {
              category: {
                select: { name: true, slug: true },
              },
              images: {
                where: { isPrimary: true },
                take: 1,
              },
              reviews: {
                select: {
                  rating: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              products: {
                where: { isPublished: true },
              },
            },
          },
        },
      });

      if (!brand) {
        throw new NotFoundException(`Brand with slug ${slug} not found`);
      }

      return brand;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.brandErrorOptions,
        `Failed to fetch brand with slug ${slug}`,
      );
    }
  }

  // Update brand details
  async update(id: string, updateBrandDto: UpdateBrandDto) {
    try {
      // Check if brand exists
      const brandExists = await this.prisma.brand.findUnique({
        where: { id },
      });

      if (!brandExists) {
        throw new NotFoundException(`Brand with ID ${id} not found`);
      }

      const { name, slug, ...restData } = updateBrandDto;

      // Generate slug if name is updated and slug is not provided
      let brandSlug = slug;
      if (name && !slug) {
        brandSlug = this.generateSlug(name);
      }

      const updateData: Prisma.BrandUpdateInput = { ...restData };
      if (name) updateData.name = name;
      if (brandSlug) updateData.slug = brandSlug;

      const updatedBrand = await this.prisma.brand.update({
        where: { id },
        data: updateData,
        include: {
          _count: {
            select: {
              products: {
                where: { isPublished: true },
              },
            },
          },
        },
      });

      return {
        message: 'Brand updated successfully',
        brand: updatedBrand,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.brandErrorOptions,
        `Failed to update brand with ID ${id}`,
      );
    }
  }

  // Toggle brand featured status
  async toggleFeatured(id: string) {
    try {
      const brand = await this.prisma.brand.findUnique({
        where: { id },
      });

      if (!brand) {
        throw new NotFoundException(`Brand with ID ${id} not found`);
      }

      const updatedBrand = await this.prisma.brand.update({
        where: { id },
        data: { isFeatured: !brand.isFeatured },
      });

      return {
        message: `Brand ${updatedBrand.isFeatured ? 'added to' : 'removed from'} featured successfully`,
        brand: updatedBrand,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.brandErrorOptions,
        `Failed to toggle featured status for brand with ID ${id}`,
      );
    }
  }

  // Toggle brand active status
  async toggleActive(id: string) {
    try {
      const brand = await this.prisma.brand.findUnique({
        where: { id },
      });

      if (!brand) {
        throw new NotFoundException(`Brand with ID ${id} not found`);
      }

      const updatedBrand = await this.prisma.brand.update({
        where: { id },
        data: { isActive: !brand.isActive },
      });

      return {
        message: `Brand ${updatedBrand.isActive ? 'activated' : 'deactivated'} successfully`,
        brand: updatedBrand,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.brandErrorOptions,
        `Failed to toggle active status for brand with ID ${id}`,
      );
    }
  }

  // Delete brand
  async remove(id: string) {
    try {
      // Check if brand exists
      const brand = await this.prisma.brand.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
      });

      if (!brand) {
        throw new NotFoundException(`Brand with ID ${id} not found`);
      }

      // Check if brand has products
      if (brand._count.products > 0) {
        throw new BadRequestException(
          'Cannot delete brand with associated products. Please reassign or delete the products first.',
        );
      }

      await this.prisma.brand.delete({
        where: { id },
      });

      return {
        message: 'Brand deleted successfully',
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
        this.brandErrorOptions,
        `Failed to delete brand with ID ${id}`,
      );
    }
  }

  // Get brand statistics
  async getStats(id: string) {
    try {
      const brand = await this.prisma.brand.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              products: {
                where: { isPublished: true },
              },
            },
          },
          products: {
            where: { isPublished: true },
            select: {
              basePrice: true,
              salePrice: true,
              stockQuantity: true,
              averageRating: true,
              _count: {
                select: {
                  reviews: true,
                },
              },
            },
          },
        },
      });

      if (!brand) {
        throw new NotFoundException(`Brand with ID ${id} not found`);
      }

      const totalProducts = brand._count.products;
      const totalReviews = brand.products.reduce(
        (acc, product) => acc + product._count.reviews,
        0,
      );
      const averageRating =
        totalProducts > 0
          ? brand.products.reduce(
              (acc, product) => acc + (product.averageRating || 0),
              0,
            ) / totalProducts
          : 0;
      const totalValue = brand.products.reduce(
        (acc, product) =>
          acc +
          (product.salePrice || product.basePrice) * product.stockQuantity,
        0,
      );

      const stats = {
        totalProducts,
        totalReviews,
        averageRating: Number(averageRating.toFixed(2)),
        totalValue: Number(totalValue.toFixed(2)),
      };

      return {
        brand: {
          id: brand.id,
          name: brand.name,
          slug: brand.slug,
        },
        stats,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.brandErrorOptions,
        `Failed to fetch stats for brand with ID ${id}`,
      );
    }
  }

  // Bulk update brands
  async bulkUpdate(ids: string[], data: UpdateBrandDto) {
    try {
      // Check if all brands exist
      const brands = await this.prisma.brand.findMany({
        where: { id: { in: ids } },
      });

      if (brands.length !== ids.length) {
        throw new NotFoundException('One or more brands not found');
      }

      const { name, slug, ...restData } = data;

      // Generate slug if name is provided
      let brandSlug = slug;
      if (name && !slug) {
        brandSlug = this.generateSlug(name);
      }

      const updateData: Prisma.BrandUpdateInput = { ...restData };
      if (name) updateData.name = name;
      if (brandSlug) updateData.slug = brandSlug;

      const result = await this.prisma.brand.updateMany({
        where: { id: { in: ids } },
        data: updateData,
      });

      return {
        message: `${result.count} brands updated successfully`,
        count: result.count,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.brandErrorOptions,
        'Failed to bulk update brands',
      );
    }
  }
}

// src/category/category.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';

@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  private readonly categoryErrorOptions = {
    entity: 'category',
    uniqueFieldMap: {
      name: 'Category name already exists',
      slug: 'Category slug already exists',
    },
    foreignKeyMap: {
      parentId: 'Parent category does not exist',
    },
    customMessages: {
      P2003: 'Parent category does not exist',
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

  // Create a new category
  async create(createCategoryDto: CreateCategoryDto) {
    try {
      const { name, slug, parentId, ...restData } = createCategoryDto;

      const categorySlug = slug || this.generateSlug(name);

      // Validate parent category if provided
      if (parentId) {
        const parentCategory = await this.prisma.category.findUnique({
          where: { id: parentId },
        });
        if (!parentCategory) {
          throw new BadRequestException('Parent category does not exist');
        }
      }

      const category = await this.prisma.category.create({
        data: {
          name,
          slug: categorySlug,
          parentId,
          ...restData,
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              products: true,
              children: true,
            },
          },
        },
      });

      return {
        message: 'Category created successfully',
        category,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.categoryErrorOptions,
        'Failed to create category',
      );
    }
  }

  // Get all categories with pagination and filtering
  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.CategoryWhereInput;
    orderBy?: Prisma.CategoryOrderByWithRelationInput;
    includeChildren?: boolean;
    includeProducts?: boolean;
  }) {
    try {
      const {
        skip,
        take,
        where,
        orderBy,
        includeChildren = false,
        includeProducts = false,
      } = params || {};

      const include: any = {
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      };

      if (includeChildren) {
        include.children = {
          where: { isActive: true },
          include: {
            _count: {
              select: {
                products: true,
              },
            },
          },
        };
      }

      if (includeProducts) {
        include.products = {
          where: { isPublished: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            brand: {
              select: {
                name: true,
                slug: true,
              },
            },
            images: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        };
      }

      const categories = await this.prisma.category.findMany({
        skip,
        take,
        where,
        include,
        orderBy: orderBy || { sortOrder: 'asc', name: 'asc' },
      });

      return categories;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.categoryErrorOptions,
        'Failed to fetch categories',
      );
    }
  }

  // Get categories with query parameters
  async findWithQuery(query: QueryCategoryDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        parentId,
        isActive,
        includeChildren = false,
        includeProducts = false,
        sortBy = 'sortOrder',
        sortOrder = 'asc',
      } = query;

      const skip = (page - 1) * limit;
      const where: Prisma.CategoryWhereInput = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (parentId) {
        where.parentId = parentId;
      } else {
        // If no parentId specified, get top-level categories by default
        where.parentId = null;
      }

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      const include: any = {
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      };

      if (includeChildren) {
        include.children = {
          where: { isActive: true },
          include: {
            _count: {
              select: {
                products: true,
              },
            },
          },
        };
      }

      if (includeProducts) {
        include.products = {
          where: { isPublished: true },
          take: 5,
          orderBy: { createdAt: 'desc' },
        };
      }

      const [categories, total] = await Promise.all([
        this.prisma.category.findMany({
          skip,
          take: limit,
          where,
          include,
          orderBy: { [sortBy]: sortOrder },
        }),
        this.prisma.category.count({ where }),
      ]);

      return {
        categories,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.categoryErrorOptions,
        'Failed to fetch categories with query',
      );
    }
  }

  // Get category tree (hierarchical structure)
  async getCategoryTree(includeProductCount: boolean = true) {
    try {
      const categories = await this.prisma.category.findMany({
        where: { isActive: true },
        include: {
          _count: includeProductCount
            ? {
                select: {
                  products: {
                    where: { isPublished: true },
                  },
                },
              }
            : false,
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });

      // Build tree structure
      const buildTree = (parentId: string | null = null): any[] => {
        return categories
          .filter((category) => category.parentId === parentId)
          .map((category) => ({
            id: category.id,
            name: category.name,
            slug: category.slug,
            description: category.description,
            imageUrl: category.imageUrl,
            sortOrder: category.sortOrder,
            isActive: category.isActive,
            productCount: category._count?.products || 0,
            children: buildTree(category.id),
          }));
      };

      return buildTree();
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.categoryErrorOptions,
        'Failed to fetch category tree',
      );
    }
  }

  // Get active categories only
  async findActive() {
    try {
      return await this.prisma.category.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: {
              products: {
                where: { isPublished: true },
              },
              children: true,
            },
          },
        },
        orderBy: { sortOrder: 'asc', name: 'asc' },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.categoryErrorOptions,
        'Failed to fetch active categories',
      );
    }
  }

  // Get top-level categories (no parent)
  async findTopLevel() {
    try {
      return await this.prisma.category.findMany({
        where: {
          parentId: null,
          isActive: true,
        },
        include: {
          children: {
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
          },
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
        this.categoryErrorOptions,
        'Failed to fetch top-level categories',
      );
    }
  }

  // Get a single category by ID
  async findOne(id: string) {
    try {
      const category = await this.prisma.category.findUnique({
        where: { id },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          children: {
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
          },
          products: {
            where: { isPublished: true },
            include: {
              brand: {
                select: {
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
            take: 20,
          },
          _count: {
            select: {
              products: {
                where: { isPublished: true },
              },
              children: true,
            },
          },
        },
      });

      if (!category) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }

      return category;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.categoryErrorOptions,
        `Failed to fetch category with ID ${id}`,
      );
    }
  }

  // Get category by slug
  async findBySlug(slug: string) {
    try {
      const category = await this.prisma.category.findUnique({
        where: { slug },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          children: {
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
          },
          products: {
            where: { isPublished: true },
            include: {
              brand: {
                select: {
                  name: true,
                  slug: true,
                },
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
              children: true,
            },
          },
        },
      });

      if (!category) {
        throw new NotFoundException(`Category with slug ${slug} not found`);
      }

      return category;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.categoryErrorOptions,
        `Failed to fetch category with slug ${slug}`,
      );
    }
  }

  // Update category details
  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    try {
      // Check if category exists
      const categoryExists = await this.prisma.category.findUnique({
        where: { id },
      });

      if (!categoryExists) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }

      const { name, slug, parentId, ...restData } = updateCategoryDto;

      // Prevent circular reference
      if (parentId === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }

      // Validate parent category if provided
      if (parentId) {
        const parentCategory = await this.prisma.category.findUnique({
          where: { id: parentId },
        });
        if (!parentCategory) {
          throw new BadRequestException('Parent category does not exist');
        }

        // Check for circular reference in hierarchy
        const isCircular = await this.checkCircularReference(id, parentId);
        if (isCircular) {
          throw new BadRequestException(
            'Circular reference detected in category hierarchy',
          );
        }
      }

      // Generate slug if name is updated and slug is not provided
      let categorySlug = slug;
      if (name && !slug) {
        categorySlug = this.generateSlug(name);
      }

      const updateData: Prisma.CategoryUpdateInput = { ...restData };
      if (name) updateData.name = name;
      if (categorySlug) updateData.slug = categorySlug;
      //   if (parentId !== undefined) updateData.parentId = parentId;

      const updatedCategory = await this.prisma.category.update({
        where: { id },
        data: updateData,
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              products: true,
              children: true,
            },
          },
        },
      });

      return {
        message: 'Category updated successfully',
        category: updatedCategory,
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
        this.categoryErrorOptions,
        `Failed to update category with ID ${id}`,
      );
    }
  }

  // Check for circular reference in category hierarchy
  private async checkCircularReference(
    categoryId: string,
    potentialParentId: string,
  ): Promise<boolean> {
    let currentId = potentialParentId;

    while (currentId) {
      if (currentId === categoryId) {
        return true; // Circular reference detected
      }

      const parent = await this.prisma.category.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

      //   currentId = parent?.parentId || null;
    }

    return false;
  }

  // Toggle category active status
  async toggleActive(id: string) {
    try {
      const category = await this.prisma.category.findUnique({
        where: { id },
      });

      if (!category) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }

      const updatedCategory = await this.prisma.category.update({
        where: { id },
        data: { isActive: !category.isActive },
        include: {
          _count: {
            select: {
              products: true,
              children: true,
            },
          },
        },
      });

      return {
        message: `Category ${updatedCategory.isActive ? 'activated' : 'deactivated'} successfully`,
        category: updatedCategory,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.categoryErrorOptions,
        `Failed to toggle active status for category with ID ${id}`,
      );
    }
  }

  // Delete category
  async remove(id: string) {
    try {
      // Check if category exists
      const category = await this.prisma.category.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              products: true,
              children: true,
            },
          },
        },
      });

      if (!category) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }

      // Check if category has products or children
      if (category._count.products > 0) {
        throw new BadRequestException(
          'Cannot delete category with associated products. Please reassign or delete the products first.',
        );
      }

      if (category._count.children > 0) {
        throw new BadRequestException(
          'Cannot delete category with sub-categories. Please delete or reassign the sub-categories first.',
        );
      }

      await this.prisma.category.delete({
        where: { id },
      });

      return {
        message: 'Category deleted successfully',
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
        this.categoryErrorOptions,
        `Failed to delete category with ID ${id}`,
      );
    }
  }

  // Get category statistics
  async getStats() {
    try {
      const [
        totalCategories,
        activeCategories,
        categoriesWithProducts,
        topLevelCategories,
        subCategories,
      ] = await Promise.all([
        this.prisma.category.count(),
        this.prisma.category.count({ where: { isActive: true } }),
        this.prisma.category.count({
          where: {
            products: {
              some: { isPublished: true },
            },
          },
        }),
        this.prisma.category.count({ where: { parentId: null } }),
        this.prisma.category.count({ where: { parentId: { not: null } } }),
      ]);

      const stats = {
        totalCategories,
        activeCategories,
        categoriesWithProducts,
        topLevelCategories,
        subCategories,
      };

      return stats;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.categoryErrorOptions,
        'Failed to fetch category statistics',
      );
    }
  }

  // Reorder categories
  async reorder(updates: Array<{ id: string; sortOrder: number }>) {
    try {
      const transactions = updates.map((update) =>
        this.prisma.category.update({
          where: { id: update.id },
          data: { sortOrder: update.sortOrder },
        }),
      );

      await this.prisma.$transaction(transactions);

      return {
        message: 'Categories reordered successfully',
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.categoryErrorOptions,
        'Failed to reorder categories',
      );
    }
  }
}

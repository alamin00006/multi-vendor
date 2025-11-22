// src/product-attribute/product-attribute.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';
import { CreateProductAttributeDto } from './dto/create-product-attribute.dto';
import { UpdateProductAttributeDto } from './dto/update-product-attribute.dto';
import { QueryProductAttributeDto } from './dto/query-product-attribute.dto';

@Injectable()
export class ProductAttributeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  private readonly productAttributeErrorOptions = {
    entity: 'product attribute',
    uniqueFieldMap: {
      name: 'Product attribute name already exists',
      slug: 'Product attribute slug already exists',
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

  // Create a new product attribute
  async create(createProductAttributeDto: CreateProductAttributeDto) {
    try {
      const { name, slug, ...attributeData } = createProductAttributeDto;

      const attributeSlug = slug || this.generateSlug(name);

      const productAttribute = await this.prisma.productAttribute.create({
        data: {
          name,
          slug: attributeSlug,
          ...attributeData,
        },
        include: {
          attributeValues: {
            orderBy: { sortOrder: 'asc' },
          },
          _count: {
            select: {
              attributeValues: true,
            },
          },
        },
      });

      return {
        message: 'Product attribute created successfully',
        productAttribute,
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productAttributeErrorOptions,
        'Failed to create product attribute',
      );
    }
  }

  // Get all product attributes with filtering
  async findAll(query?: QueryProductAttributeDto) {
    try {
      const where: Prisma.ProductAttributeWhereInput = {};

      if (query?.search) {
        where.OR = [
          { name: { contains: query.search, mode: 'insensitive' } },
          { displayName: { contains: query.search, mode: 'insensitive' } },
          { slug: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      if (query?.type) {
        where.type = query.type;
      }

      if (query?.isFilterable !== undefined) {
        where.isFilterable = query.isFilterable;
      }

      const include: Prisma.ProductAttributeInclude = {
        _count: {
          select: {
            attributeValues: true,
          },
        },
      };

      if (query?.includeValues) {
        include.attributeValues = {
          orderBy: { sortOrder: 'asc' },
        };
      }

      const productAttributes = await this.prisma.productAttribute.findMany({
        where,
        include,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });

      return productAttributes;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productAttributeErrorOptions,
        'Failed to fetch product attributes',
      );
    }
  }

  // Get filterable attributes (for product filtering)
  async findFilterable() {
    try {
      const filterableAttributes = await this.prisma.productAttribute.findMany({
        where: {
          isFilterable: true,
        },
        include: {
          attributeValues: {
            where: {
              OR: [{ colorCode: { not: null } }, { imageUrl: { not: null } }],
            },
            orderBy: { sortOrder: 'asc' },
          },
          _count: {
            select: {
              attributeValues: true,
            },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });

      return filterableAttributes;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productAttributeErrorOptions,
        'Failed to fetch filterable attributes',
      );
    }
  }

  // Get attributes by type
  async findByType(type: string) {
    try {
      const attributes = await this.prisma.productAttribute.findMany({
        where: {
          type: type as any,
        },
        include: {
          attributeValues: {
            orderBy: { sortOrder: 'asc' },
          },
          _count: {
            select: {
              attributeValues: true,
            },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });

      return attributes;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productAttributeErrorOptions,
        `Failed to fetch attributes of type ${type}`,
      );
    }
  }

  // Get a single product attribute by ID
  async findOne(id: string) {
    try {
      const productAttribute = await this.prisma.productAttribute.findUnique({
        where: { id },
        include: {
          attributeValues: {
            orderBy: { sortOrder: 'asc' },
          },
          _count: {
            select: {
              attributeValues: true,
            },
          },
        },
      });

      if (!productAttribute) {
        throw new NotFoundException(
          `Product attribute with ID ${id} not found`,
        );
      }

      return productAttribute;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productAttributeErrorOptions,
        `Failed to fetch product attribute with ID ${id}`,
      );
    }
  }

  // Get product attribute by slug
  async findBySlug(slug: string) {
    try {
      const productAttribute = await this.prisma.productAttribute.findUnique({
        where: { slug },
        include: {
          attributeValues: {
            orderBy: { sortOrder: 'asc' },
          },
          _count: {
            select: {
              attributeValues: true,
            },
          },
        },
      });

      if (!productAttribute) {
        throw new NotFoundException(
          `Product attribute with slug ${slug} not found`,
        );
      }

      return productAttribute;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productAttributeErrorOptions,
        `Failed to fetch product attribute with slug ${slug}`,
      );
    }
  }

  // Update product attribute
  async update(
    id: string,
    updateProductAttributeDto: UpdateProductAttributeDto,
  ) {
    try {
      // Check if attribute exists
      const attributeExists = await this.prisma.productAttribute.findUnique({
        where: { id },
      });

      if (!attributeExists) {
        throw new NotFoundException(
          `Product attribute with ID ${id} not found`,
        );
      }

      const { name, slug, ...updateData } = updateProductAttributeDto;

      // Generate slug if name is updated and slug is not provided
      let attributeSlug = slug;
      if (name && !slug) {
        attributeSlug = this.generateSlug(name);
      }

      const finalUpdateData: Prisma.ProductAttributeUpdateInput = {
        ...updateData,
      };
      if (name) finalUpdateData.name = name;
      if (attributeSlug) finalUpdateData.slug = attributeSlug;

      const updatedAttribute = await this.prisma.productAttribute.update({
        where: { id },
        data: finalUpdateData,
        include: {
          attributeValues: {
            orderBy: { sortOrder: 'asc' },
          },
          _count: {
            select: {
              attributeValues: true,
            },
          },
        },
      });

      return {
        message: 'Product attribute updated successfully',
        productAttribute: updatedAttribute,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productAttributeErrorOptions,
        `Failed to update product attribute with ID ${id}`,
      );
    }
  }

  // Toggle filterable status
  async toggleFilterable(id: string) {
    try {
      const attribute = await this.prisma.productAttribute.findUnique({
        where: { id },
      });

      if (!attribute) {
        throw new NotFoundException(
          `Product attribute with ID ${id} not found`,
        );
      }

      const updatedAttribute = await this.prisma.productAttribute.update({
        where: { id },
        data: { isFilterable: !attribute.isFilterable },
        include: {
          _count: {
            select: {
              attributeValues: true,
            },
          },
        },
      });

      return {
        message: `Product attribute ${updatedAttribute.isFilterable ? 'enabled' : 'disabled'} for filtering`,
        productAttribute: updatedAttribute,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productAttributeErrorOptions,
        `Failed to toggle filterable status for attribute with ID ${id}`,
      );
    }
  }

  // Reorder attributes
  async reorder(updates: Array<{ id: string; sortOrder: number }>) {
    try {
      const transactions = updates.map((update) =>
        this.prisma.productAttribute.update({
          where: { id: update.id },
          data: { sortOrder: update.sortOrder },
        }),
      );

      await this.prisma.$transaction(transactions);

      return {
        message: 'Product attributes reordered successfully',
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productAttributeErrorOptions,
        'Failed to reorder product attributes',
      );
    }
  }

  // Delete product attribute
  async remove(id: string) {
    try {
      // Check if attribute exists
      const attribute = await this.prisma.productAttribute.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              attributeValues: true,
            },
          },
        },
      });

      if (!attribute) {
        throw new NotFoundException(
          `Product attribute with ID ${id} not found`,
        );
      }

      // Check if attribute has values
      if (attribute._count.attributeValues > 0) {
        throw new BadRequestException(
          'Cannot delete attribute with associated values. Please delete the attribute values first.',
        );
      }

      await this.prisma.productAttribute.delete({
        where: { id },
      });

      return {
        message: 'Product attribute deleted successfully',
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
        this.productAttributeErrorOptions,
        `Failed to delete product attribute with ID ${id}`,
      );
    }
  }

  // Get attribute statistics
  async getStats() {
    try {
      const [
        totalAttributes,
        attributesByType,
        filterableAttributes,
        attributesWithValues,
      ] = await Promise.all([
        this.prisma.productAttribute.count(),
        this.prisma.productAttribute.groupBy({
          by: ['type'],
          _count: {
            _all: true,
          },
        }),
        this.prisma.productAttribute.count({ where: { isFilterable: true } }),
        this.prisma.productAttribute.count({
          where: {
            attributeValues: {
              some: {},
            },
          },
        }),
      ]);

      const stats = {
        totalAttributes,
        attributesByType: attributesByType.map((item) => ({
          type: item.type,
          count: item._count._all,
        })),
        filterableAttributes,
        attributesWithValues,
      };

      return stats;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productAttributeErrorOptions,
        'Failed to fetch attribute statistics',
      );
    }
  }

  // Validate attribute type and values compatibility
  validateAttributeType(
    type: string,
    values: Array<{ colorCode?: string; imageUrl?: string }>,
  ): boolean {
    if (type === 'COLOR') {
      // For color type, values should have colorCode
      return values.every((value) => value.colorCode);
    } else if (type === 'IMAGE') {
      // For image type, values should have imageUrl
      return values.every((value) => value.imageUrl);
    }
    // For text type, no specific validation needed
    return true;
  }

  // Get attributes for product variant creation
  async getAttributesForVariants() {
    try {
      const attributes = await this.prisma.productAttribute.findMany({
        where: {
          type: { in: ['TEXT', 'COLOR', 'IMAGE'] },
        },
        include: {
          attributeValues: {
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });

      return attributes;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productAttributeErrorOptions,
        'Failed to fetch attributes for variants',
      );
    }
  }

  // Bulk update attributes
  async bulkUpdate(ids: string[], data: UpdateProductAttributeDto) {
    try {
      // Check if all attributes exist
      const attributes = await this.prisma.productAttribute.findMany({
        where: { id: { in: ids } },
      });

      if (attributes.length !== ids.length) {
        throw new NotFoundException('One or more attributes not found');
      }

      const { name, slug, ...updateData } = data;

      // Generate slug if name is provided
      let attributeSlug = slug;
      if (name && !slug) {
        attributeSlug = this.generateSlug(name);
      }

      const finalUpdateData: Prisma.ProductAttributeUpdateInput = {
        ...updateData,
      };
      if (name) finalUpdateData.name = name;
      if (attributeSlug) finalUpdateData.slug = attributeSlug;

      const result = await this.prisma.productAttribute.updateMany({
        where: { id: { in: ids } },
        data: finalUpdateData,
      });

      return {
        message: `${result.count} attributes updated successfully`,
        count: result.count,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productAttributeErrorOptions,
        'Failed to bulk update attributes',
      );
    }
  }
}

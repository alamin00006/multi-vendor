// src/product-attribute-value/product-attribute-value.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';
import { CreateProductAttributeValueDto } from './dto/create-product-attribute-value.dto';
import { UpdateProductAttributeValueDto } from './dto/update-product-attribute-value.dto';
import { QueryProductAttributeValueDto } from './dto/query-product-attribute-value.dto';
import { BulkCreateAttributeValueDto } from './dto/bulk-create-attribute-value.dto';

@Injectable()
export class ProductAttributeValueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  private readonly productAttributeValueErrorOptions = {
    entity: 'product attribute value',
    uniqueFieldMap: {
      value: 'Attribute value already exists for this attribute',
    },
    foreignKeyMap: {
      attributeId: 'Product attribute does not exist',
    },
    customMessages: {
      P2003: 'Product attribute does not exist',
    },
  };

  // Validate attribute value based on attribute type
  private validateAttributeValue(
    attributeType: string,
    valueData: { colorCode?: string; imageUrl?: string },
  ): boolean {
    if (attributeType === 'COLOR' && !valueData.colorCode) {
      throw new BadRequestException(
        'Color attribute values must have a color code',
      );
    }
    if (attributeType === 'IMAGE' && !valueData.imageUrl) {
      throw new BadRequestException(
        'Image attribute values must have an image URL',
      );
    }
    return true;
  }

  // Create a new product attribute value
  async create(createProductAttributeValueDto: CreateProductAttributeValueDto) {
    try {
      const { attributeId, ...valueData } = createProductAttributeValueDto;

      // Validate attribute exists and get its type
      const attribute = await this.prisma.productAttribute.findUnique({
        where: { id: attributeId },
      });
      if (!attribute) {
        throw new BadRequestException('Product attribute does not exist');
      }

      // Validate value based on attribute type
      this.validateAttributeValue(attribute.type, valueData);

      const productAttributeValue =
        await this.prisma.productAttributeValue.create({
          data: {
            ...valueData,
            attributeId,
          },
          include: {
            attribute: {
              select: {
                id: true,
                name: true,
                slug: true,
                type: true,
                displayName: true,
              },
            },
          },
        });

      return {
        message: 'Product attribute value created successfully',
        productAttributeValue,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productAttributeValueErrorOptions,
        'Failed to create product attribute value',
      );
    }
  }

  // Bulk create attribute values
  async bulkCreate(bulkCreateAttributeValueDto: BulkCreateAttributeValueDto) {
    try {
      const { attributeId, values } = bulkCreateAttributeValueDto;

      // Validate attribute exists and get its type
      const attribute = await this.prisma.productAttribute.findUnique({
        where: { id: attributeId },
      });
      if (!attribute) {
        throw new BadRequestException('Product attribute does not exist');
      }

      // Get current max sortOrder for this attribute
      const maxSortOrder = await this.prisma.productAttributeValue.aggregate({
        where: { attributeId },
        _max: {
          sortOrder: true,
        },
      });

      let currentSortOrder = (maxSortOrder._max.sortOrder || 0) + 1;

      const createdValues = [];
      const errors = [];

      //   for (const valueData of values) {
      //     try {
      //       // Validate value based on attribute type
      //       this.validateAttributeValue(attribute.type, valueData);

      //       const attributeValue = await this.prisma.productAttributeValue.create(
      //         {
      //           data: {
      //             ...valueData,
      //             attributeId,
      //             sortOrder: valueData.sortOrder || currentSortOrder++,
      //           },
      //         },
      //       );
      //       createdValues.push(attributeValue);
      //     } catch (error) {
      //       errors.push({
      //         value: valueData.value,
      //         error: error.message,
      //       });
      //     }
      //   }

      return {
        message: `Bulk attribute value creation completed. ${createdValues.length} values created, ${errors.length} failed.`,
        data: {
          created: createdValues.length,
          failed: errors.length,
          attributeValues: createdValues,
          errors,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productAttributeValueErrorOptions,
        'Failed to bulk create attribute values',
      );
    }
  }

  // Get all attribute values with filtering
  async findAll(query?: QueryProductAttributeValueDto) {
    try {
      const where: Prisma.ProductAttributeValueWhereInput = {};

      if (query?.attributeId) {
        where.attributeId = query.attributeId;
      }

      //   if (query?.productId) {
      //     // Filter values used by specific products through variants
      //     where.attribute = {
      //       productAttributes: {
      //         some: {
      //           productId: query.productId,
      //         },
      //       },
      //     };
      //   }

      const attributeValues = await this.prisma.productAttributeValue.findMany({
        where,
        include: {
          attribute: {
            select: {
              id: true,
              name: true,
              slug: true,
              type: true,
              displayName: true,
            },
          },
        },
        orderBy: [
          { attribute: { sortOrder: 'asc' } },
          { sortOrder: 'asc' },
          { value: 'asc' },
        ],
      });

      return attributeValues;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productAttributeValueErrorOptions,
        'Failed to fetch product attribute values',
      );
    }
  }

  // Get values for a specific attribute
  async findByAttributeId(attributeId: string) {
    try {
      // Validate attribute exists
      const attribute = await this.prisma.productAttribute.findUnique({
        where: { id: attributeId },
      });
      if (!attribute) {
        throw new NotFoundException(
          `Product attribute with ID ${attributeId} not found`,
        );
      }

      const attributeValues = await this.prisma.productAttributeValue.findMany({
        where: { attributeId },
        orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }],
      });

      return attributeValues;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productAttributeValueErrorOptions,
        `Failed to fetch values for attribute ${attributeId}`,
      );
    }
  }

  // Get values by attribute slug
  async findByAttributeSlug(attributeSlug: string) {
    try {
      const attribute = await this.prisma.productAttribute.findUnique({
        where: { slug: attributeSlug },
      });

      if (!attribute) {
        throw new NotFoundException(
          `Product attribute with slug ${attributeSlug} not found`,
        );
      }

      const attributeValues = await this.prisma.productAttributeValue.findMany({
        where: { attributeId: attribute.id },
        orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }],
      });

      return {
        attribute,
        values: attributeValues,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productAttributeValueErrorOptions,
        `Failed to fetch values for attribute ${attributeSlug}`,
      );
    }
  }

  // Get a single attribute value by ID
  async findOne(id: string) {
    try {
      const attributeValue = await this.prisma.productAttributeValue.findUnique(
        {
          where: { id },
          include: {
            attribute: {
              select: {
                id: true,
                name: true,
                slug: true,
                type: true,
                displayName: true,
                isFilterable: true,
              },
            },
          },
        },
      );

      if (!attributeValue) {
        throw new NotFoundException(
          `Product attribute value with ID ${id} not found`,
        );
      }

      return attributeValue;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productAttributeValueErrorOptions,
        `Failed to fetch product attribute value with ID ${id}`,
      );
    }
  }

  // Update attribute value
  async update(
    id: string,
    updateProductAttributeValueDto: UpdateProductAttributeValueDto,
  ) {
    try {
      // Check if attribute value exists and get current data
      const existingValue = await this.prisma.productAttributeValue.findUnique({
        where: { id },
        include: {
          attribute: {
            select: {
              type: true,
            },
          },
        },
      });

      if (!existingValue) {
        throw new NotFoundException(
          `Product attribute value with ID ${id} not found`,
        );
      }

      const { attributeId, ...updateData } = updateProductAttributeValueDto;

      // If attributeId is being changed, validate the new attribute
      if (attributeId && attributeId !== existingValue.attributeId) {
        const newAttribute = await this.prisma.productAttribute.findUnique({
          where: { id: attributeId },
        });
        if (!newAttribute) {
          throw new BadRequestException('New product attribute does not exist');
        }
        // Validate value based on new attribute type
        this.validateAttributeValue(newAttribute.type, updateData);
      } else {
        // Validate value based on current attribute type
        this.validateAttributeValue(existingValue.attribute.type, updateData);
      }

      const updatedValue = await this.prisma.productAttributeValue.update({
        where: { id },
        data: {
          ...updateData,
          ...(attributeId && { attributeId }),
        },
        include: {
          attribute: {
            select: {
              id: true,
              name: true,
              slug: true,
              type: true,
              displayName: true,
            },
          },
        },
      });

      return {
        message: 'Product attribute value updated successfully',
        productAttributeValue: updatedValue,
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
        this.productAttributeValueErrorOptions,
        `Failed to update product attribute value with ID ${id}`,
      );
    }
  }

  // Reorder attribute values
  async reorder(
    attributeId: string,
    valueOrder: Array<{ id: string; sortOrder: number }>,
  ) {
    try {
      // Validate attribute exists
      const attribute = await this.prisma.productAttribute.findUnique({
        where: { id: attributeId },
      });
      if (!attribute) {
        throw new BadRequestException('Product attribute does not exist');
      }

      // Validate all values belong to the attribute
      const valueIds = valueOrder.map((item) => item.id);
      const existingValues = await this.prisma.productAttributeValue.findMany({
        where: {
          id: { in: valueIds },
          attributeId,
        },
        select: { id: true },
      });

      if (existingValues.length !== valueIds.length) {
        throw new BadRequestException(
          'Some values do not belong to the specified attribute',
        );
      }

      const transactions = valueOrder.map((item) =>
        this.prisma.productAttributeValue.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      );

      await this.prisma.$transaction(transactions);

      return {
        message: 'Attribute values reordered successfully',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productAttributeValueErrorOptions,
        'Failed to reorder attribute values',
      );
    }
  }

  // Delete attribute value
  async remove(id: string) {
    try {
      // Check if attribute value exists
      const attributeValue = await this.prisma.productAttributeValue.findUnique(
        {
          where: { id },
          include: {
            // _count: {
            //   select: {
            //     // Add counts for any future relations if needed
            //   },
            // },
          },
        },
      );

      if (!attributeValue) {
        throw new NotFoundException(
          `Product attribute value with ID ${id} not found`,
        );
      }

      // TODO: Add check for usage in product variants if needed
      // This would require a relation between variants and attribute values

      await this.prisma.productAttributeValue.delete({
        where: { id },
      });

      return {
        message: 'Product attribute value deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productAttributeValueErrorOptions,
        `Failed to delete product attribute value with ID ${id}`,
      );
    }
  }

  // Delete all values for an attribute
  async removeAllByAttribute(attributeId: string) {
    try {
      // Validate attribute exists
      const attribute = await this.prisma.productAttribute.findUnique({
        where: { id: attributeId },
      });
      if (!attribute) {
        throw new NotFoundException(
          `Product attribute with ID ${attributeId} not found`,
        );
      }

      const result = await this.prisma.productAttributeValue.deleteMany({
        where: { attributeId },
      });

      return {
        message: `All ${result.count} attribute values deleted successfully for attribute ${attributeId}`,
        count: result.count,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productAttributeValueErrorOptions,
        `Failed to delete values for attribute ${attributeId}`,
      );
    }
  }

  // Get attribute value usage statistics
  async getUsageStats(attributeValueId: string) {
    try {
      const attributeValue = await this.prisma.productAttributeValue.findUnique(
        {
          where: { id: attributeValueId },
          include: {
            attribute: {
              select: {
                name: true,
                displayName: true,
              },
            },
          },
        },
      );

      if (!attributeValue) {
        throw new NotFoundException(
          `Product attribute value with ID ${attributeValueId} not found`,
        );
      }

      // TODO: Implement usage tracking with product variants
      // This would require querying product variants that use this attribute value

      const usageCount = 0; // Placeholder - implement based on your variant structure
      const products = []; // Placeholder - implement based on your variant structure

      const stats = {
        attributeValueId,
        value: attributeValue.value,
        displayValue: attributeValue.displayValue,
        usageCount,
        products,
      };

      return stats;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productAttributeValueErrorOptions,
        `Failed to fetch usage stats for attribute value ${attributeValueId}`,
      );
    }
  }

  // Search attribute values
  async search(searchTerm: string, attributeId?: string) {
    try {
      const where: Prisma.ProductAttributeValueWhereInput = {
        OR: [
          { value: { contains: searchTerm, mode: 'insensitive' } },
          { displayValue: { contains: searchTerm, mode: 'insensitive' } },
        ],
      };

      if (attributeId) {
        where.attributeId = attributeId;
      }

      const attributeValues = await this.prisma.productAttributeValue.findMany({
        where,
        include: {
          attribute: {
            select: {
              id: true,
              name: true,
              displayName: true,
              type: true,
            },
          },
        },
        take: 20,
        orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }],
      });

      return attributeValues;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productAttributeValueErrorOptions,
        'Failed to search attribute values',
      );
    }
  }

  // Validate attribute value uniqueness within attribute
  async checkValueUniqueness(
    attributeId: string,
    value: string,
    excludeId?: string,
  ): Promise<boolean> {
    try {
      const where: Prisma.ProductAttributeValueWhereInput = {
        attributeId,
        value,
      };

      if (excludeId) {
        where.id = { not: excludeId };
      }

      const existingValue = await this.prisma.productAttributeValue.findFirst({
        where,
      });

      return !existingValue;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productAttributeValueErrorOptions,
        'Failed to check value uniqueness',
      );
    }
  }
}

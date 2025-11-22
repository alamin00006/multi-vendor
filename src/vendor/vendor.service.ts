// src/vendor/vendor.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { QueryVendorDto } from './dto/query-vendor.dto';

@Injectable()
export class VendorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  private readonly vendorErrorOptions = {
    entity: 'vendor',
    uniqueFieldMap: {
      name: 'Vendor name already exists',
      slug: 'Vendor slug already exists',
      email: 'Vendor email already exists',
    },
    foreignKeyMap: {
      ownerId: 'Owner user does not exist',
    },
    customMessages: {
      P2003: 'Owner user does not exist',
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

  // Create a new vendor
  async create(ownerId: string, createVendorDto: CreateVendorDto) {
    try {
      const { name, slug, ...vendorData } = createVendorDto;

      const vendorSlug = slug || this.generateSlug(name);

      // Validate owner exists
      const owner = await this.prisma.user.findUnique({
        where: { id: ownerId },
      });
      if (!owner) {
        throw new BadRequestException('Owner user does not exist');
      }

      // Check if user already has a vendor
      const existingVendor = await this.prisma.vendor.findFirst({
        where: { ownerId },
      });

      if (existingVendor) {
        throw new BadRequestException('User already has a vendor account');
      }

      const vendor = await this.prisma.vendor.create({
        data: {
          name,
          slug: vendorSlug,
          ownerId,
          ...vendorData,
        },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              products: true,
              vendorOrders: true,
            },
          },
        },
      });

      return {
        message: 'Vendor created successfully',
        vendor,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.vendorErrorOptions,
        'Failed to create vendor',
      );
    }
  }

  // Get all vendors with pagination and filtering
  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.VendorWhereInput;
    orderBy?: Prisma.VendorOrderByWithRelationInput;
    includeStats?: boolean;
  }) {
    try {
      const { skip, take, where, orderBy, includeStats = false } = params || {};

      const include: Prisma.VendorInclude = {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            products: true,
            vendorOrders: true,
          },
        },
      };

      if (includeStats) {
        include.products = {
          select: {
            id: true,
            isPublished: true,
          },
        };
        include.vendorOrders = {
          select: {
            id: true,
            status: true,
            totalAmount: true,
          },
        };
      }

      const vendors = await this.prisma.vendor.findMany({
        skip,
        take,
        where,
        include,
        orderBy: orderBy || { createdAt: 'desc' },
      });

      // Add stats if requested
      if (includeStats) {
        const vendorsWithStats = vendors.map((vendor) => {
          const publishedProducts = vendor.products.filter(
            (p) => p.isPublished,
          ).length;
          const pendingOrders = vendor.vendorOrders.filter(
            (o) => o.status === 'PENDING',
          ).length;
          const totalEarnings = vendor.vendorOrders
            // .filter((o) => o.status === 'COMPLETED')
            .reduce((sum, order) => sum + order.totalAmount, 0);

          const { products, vendorOrders, ...vendorData } = vendor;

          return {
            ...vendorData,
            stats: {
              totalProducts: vendor._count.products,
              publishedProducts,
              totalOrders: vendor._count.vendorOrders,
              pendingOrders,
              totalEarnings,
              pendingPayouts: 0, // This would require payout calculation
            },
          };
        });

        return vendorsWithStats;
      }

      return vendors;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.vendorErrorOptions,
        'Failed to fetch vendors',
      );
    }
  }

  // Get vendors with query parameters
  async findWithQuery(query: QueryVendorDto) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        includeStats = false,
      } = query;

      const skip = (page - 1) * limit;
      const where: Prisma.VendorWhereInput = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (status) {
        where.status = status;
      }

      const include: Prisma.VendorInclude = {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            products: true,
            vendorOrders: true,
          },
        },
      };

      if (includeStats) {
        include.products = {
          select: {
            id: true,
            isPublished: true,
          },
        };
        include.vendorOrders = {
          select: {
            id: true,
            status: true,
            totalAmount: true,
          },
        };
      }

      const [vendors, total] = await Promise.all([
        this.prisma.vendor.findMany({
          skip,
          take: limit,
          where,
          include,
          orderBy: { [sortBy]: sortOrder },
        }),
        this.prisma.vendor.count({ where }),
      ]);

      // Add stats if requested
      let vendorsWithData = vendors;
      //   if (includeStats) {
      //     vendorsWithData = vendors.map((vendor) => {
      //       const publishedProducts = vendor.products.filter(
      //         (p) => p.isPublished,
      //       ).length;
      //       const pendingOrders = vendor.vendorOrders.filter(
      //         (o) => o.status === 'PENDING',
      //       ).length;
      //       const totalEarnings = vendor.vendorOrders
      //         .filter((o) => o.status === 'COMPLETED')
      //         .reduce((sum, order) => sum + order.totalAmount, 0);

      //       const { products, vendorOrders, ...vendorData } = vendor;

      //       return {
      //         ...vendorData,
      //         stats: {
      //           totalProducts: vendor._count.products,
      //           publishedProducts,
      //           totalOrders: vendor._count.vendorOrders,
      //           pendingOrders,
      //           totalEarnings,
      //           pendingPayouts: 0,
      //         },
      //       };
      //     });
      //   }

      return {
        vendors: vendorsWithData,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.vendorErrorOptions,
        'Failed to fetch vendors with query',
      );
    }
  }

  // Get active vendors only
  async findActive() {
    try {
      return await this.prisma.vendor.findMany({
        // where: { status: 'ACTIVE' },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
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
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.vendorErrorOptions,
        'Failed to fetch active vendors',
      );
    }
  }

  // Get vendor by owner ID
  async findByOwnerId(ownerId: string) {
    try {
      const vendor = await this.prisma.vendor.findFirst({
        where: { ownerId },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              products: true,
              vendorOrders: true,
            },
          },
        },
      });

      if (!vendor) {
        throw new NotFoundException(`Vendor for owner ${ownerId} not found`);
      }

      return vendor;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.vendorErrorOptions,
        `Failed to fetch vendor for owner ${ownerId}`,
      );
    }
  }

  // Get a single vendor by ID
  async findOne(id: string) {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
              phone: true,
            },
          },
          products: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              name: true,
              slug: true,
              basePrice: true,
              featuredImageUrl: true,
              isPublished: true,
              stockQuantity: true,
            },
          },
          _count: {
            select: {
              products: true,
              vendorOrders: true,
              payouts: true,
            },
          },
        },
      });

      if (!vendor) {
        throw new NotFoundException(`Vendor with ID ${id} not found`);
      }

      return vendor;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.vendorErrorOptions,
        `Failed to fetch vendor with ID ${id}`,
      );
    }
  }

  // Get vendor by slug
  async findBySlug(slug: string) {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { slug },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          products: {
            where: { isPublished: true },
            take: 20,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              name: true,
              slug: true,
              basePrice: true,
              salePrice: true,
              featuredImageUrl: true,
              averageRating: true,
              totalReviews: true,
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
      });

      if (!vendor) {
        throw new NotFoundException(`Vendor with slug ${slug} not found`);
      }

      return vendor;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.vendorErrorOptions,
        `Failed to fetch vendor with slug ${slug}`,
      );
    }
  }

  // Update vendor
  async update(
    id: string,
    updateVendorDto: UpdateVendorDto,
    userId?: string,
    isAdmin: boolean = false,
  ) {
    try {
      // Check if vendor exists
      const vendor = await this.prisma.vendor.findUnique({
        where: { id },
      });

      if (!vendor) {
        throw new NotFoundException(`Vendor with ID ${id} not found`);
      }

      // Only allow owner or admin to update vendor
      if (!isAdmin && vendor.ownerId !== userId) {
        throw new ForbiddenException('You can only update your own vendor');
      }

      const { name, slug, ...updateData } = updateVendorDto;

      // Generate slug if name is updated and slug is not provided
      let vendorSlug = slug;
      if (name && !slug) {
        vendorSlug = this.generateSlug(name);
      }

      const finalUpdateData: Prisma.VendorUpdateInput = { ...updateData };
      if (name) finalUpdateData.name = name;
      if (vendorSlug) finalUpdateData.slug = vendorSlug;

      const updatedVendor = await this.prisma.vendor.update({
        where: { id },
        data: finalUpdateData,
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              products: true,
              vendorOrders: true,
            },
          },
        },
      });

      return {
        message: 'Vendor updated successfully',
        vendor: updatedVendor,
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
        this.vendorErrorOptions,
        `Failed to update vendor with ID ${id}`,
      );
    }
  }

  // Update vendor status (admin only)
  async updateStatus(id: string, status: string) {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id },
      });

      if (!vendor) {
        throw new NotFoundException(`Vendor with ID ${id} not found`);
      }

      const updatedVendor = await this.prisma.vendor.update({
        where: { id },
        data: { status: status as any },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return {
        message: `Vendor status updated to ${status} successfully`,
        vendor: updatedVendor,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.vendorErrorOptions,
        `Failed to update vendor status with ID ${id}`,
      );
    }
  }

  // Update commission percentage (admin only)
  async updateCommission(id: string, commissionPct: number) {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id },
      });

      if (!vendor) {
        throw new NotFoundException(`Vendor with ID ${id} not found`);
      }

      if (commissionPct < 0 || commissionPct > 100) {
        throw new BadRequestException(
          'Commission percentage must be between 0 and 100',
        );
      }

      const updatedVendor = await this.prisma.vendor.update({
        where: { id },
        data: { commissionPct },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return {
        message: `Vendor commission updated to ${commissionPct}% successfully`,
        vendor: updatedVendor,
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
        this.vendorErrorOptions,
        `Failed to update vendor commission with ID ${id}`,
      );
    }
  }

  // Delete vendor
  async remove(id: string, userId?: string, isAdmin: boolean = false) {
    try {
      // Check if vendor exists
      const vendor = await this.prisma.vendor.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              products: true,
              vendorOrders: true,
              payouts: true,
            },
          },
        },
      });

      if (!vendor) {
        throw new NotFoundException(`Vendor with ID ${id} not found`);
      }

      // Only allow owner or admin to delete vendor
      if (!isAdmin && vendor.ownerId !== userId) {
        throw new ForbiddenException('You can only delete your own vendor');
      }

      // Check if vendor has products, orders, or payouts
      if (vendor._count.products > 0) {
        throw new BadRequestException(
          'Cannot delete vendor with associated products. Please delete or transfer the products first.',
        );
      }

      if (vendor._count.vendorOrders > 0) {
        throw new BadRequestException(
          'Cannot delete vendor with associated orders. Please handle the orders first.',
        );
      }

      if (vendor._count.payouts > 0) {
        throw new BadRequestException(
          'Cannot delete vendor with associated payouts. Please handle the payouts first.',
        );
      }

      await this.prisma.vendor.delete({
        where: { id },
      });

      return {
        message: 'Vendor deleted successfully',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.vendorErrorOptions,
        `Failed to delete vendor with ID ${id}`,
      );
    }
  }

  // Get vendor statistics
  async getStats() {
    try {
      const [
        totalVendors,
        activeVendors,
        pendingVendors,
        suspendedVendors,
        vendorsByStatus,
        totalProducts,
      ] = await Promise.all([
        this.prisma.vendor.count(),
        this.prisma.vendor.count({ where: {} }),
        // this.prisma.vendor.count({ where: { status: 'ACTIVE' } }),
        this.prisma.vendor.count({ where: { status: 'PENDING' } }),
        this.prisma.vendor.count({ where: { status: 'SUSPENDED' } }),
        this.prisma.vendor.groupBy({
          by: ['status'],
          _count: {
            _all: true,
          },
        }),
        this.prisma.product.count({
          where: {
            // vendor: { isNot: null },
          },
        }),
      ]);

      // Calculate total earnings from vendor orders
      const earningsResult = await this.prisma.vendorOrder.aggregate({
        where: {
          //   status: 'COMPLETED',
        },
        _sum: {
          totalAmount: true,
        },
      });

      const stats = {
        totalVendors,
        activeVendors,
        pendingVendors,
        suspendedVendors,
        vendorsByStatus: vendorsByStatus.map((item) => ({
          status: item.status,
          count: item._count._all,
        })),
        totalProducts,
        totalEarnings: earningsResult._sum.totalAmount || 0,
      };

      return stats;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.vendorErrorOptions,
        'Failed to fetch vendor statistics',
      );
    }
  }

  // Get vendor dashboard data
  async getVendorDashboard(vendorId: string) {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: vendorId },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!vendor) {
        throw new NotFoundException(`Vendor with ID ${vendorId} not found`);
      }

      const [
        products,
        vendorOrders,
        recentOrders,
        lowStockProducts,
        earningsStats,
      ] = await Promise.all([
        this.prisma.product.findMany({
          where: { vendorId },
          select: {
            id: true,
            isPublished: true,
            stockQuantity: true,
            lowStockThreshold: true,
          },
        }),
        this.prisma.vendorOrder.findMany({
          where: { vendorId },
          select: {
            id: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
        }),
        this.prisma.vendorOrder.findMany({
          where: { vendorId },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            order: {
              select: {
                orderNumber: true,
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.product.findMany({
          where: {
            vendorId,
            stockQuantity: {
              lte: this.prisma.product.fields.lowStockThreshold,
              gt: 0,
            },
            isPublished: true,
          },
          take: 5,
          orderBy: { stockQuantity: 'asc' },
          select: {
            id: true,
            name: true,
            slug: true,
            stockQuantity: true,
            lowStockThreshold: true,
          },
        }),
        this.prisma.vendorOrder.aggregate({
          where: {
            vendorId,
            // status: 'COMPLETED',
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
          _sum: {
            totalAmount: true,
          },
        }),
        this.prisma.vendorOrder.aggregate({
          where: {
            vendorId,
            // status: 'COMPLETED',
            createdAt: {
              gte: new Date(
                new Date().getFullYear(),
                new Date().getMonth() - 1,
                1,
              ),
              lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
          _sum: {
            totalAmount: true,
          },
        }),
      ]);

      const publishedProducts = products.filter((p) => p.isPublished).length;
      const pendingOrders = vendorOrders.filter(
        (o) => o.status === 'PENDING',
      ).length;
      //   const completedOrders = vendorOrders.filter(
      //     (o) => o.status === 'COMPLETED',
      //   ).length;

      //   const totalEarnings = vendorOrders
      //     .filter((o) => o.status === 'COMPLETED')
      //     .reduce((sum, order) => sum + order.totalAmount, 0);

      //   const pendingPayouts = vendorOrders
      //     .filter((o) => o.status === 'COMPLETED')
      //     .reduce(
      //       (sum, order) =>
      //         sum + order.totalAmount * (1 - vendor.commissionPct / 100),
      //       0,
      //     );

      const dashboard = {
        vendor,
        stats: {
          totalProducts: products.length,
          publishedProducts,
          totalOrders: vendorOrders.length,
          pendingOrders,
          //   completedOrders,
          //   totalEarnings,
          //   pendingPayouts,
          //   thisMonthEarnings: earningsStats._sum.totalAmount || 0,
          lastMonthEarnings: 0, // This would need to be calculated properly
        },
        recentOrders,
        lowStockProducts,
      };

      return dashboard;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.vendorErrorOptions,
        `Failed to fetch vendor dashboard for ${vendorId}`,
      );
    }
  }

  // Check if user is vendor owner
  async isVendorOwner(vendorId: string, userId: string): Promise<boolean> {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: vendorId },
        select: { ownerId: true },
      });

      return vendor?.ownerId === userId;
    } catch (error) {
      console.error(`Failed to check vendor ownership:`, error);
      return false;
    }
  }

  // Bulk update vendor status (admin only)
  async bulkUpdateStatus(ids: string[], status: string) {
    try {
      const result = await this.prisma.vendor.updateMany({
        where: {
          id: { in: ids },
        },
        data: { status: status as any },
      });

      return {
        message: `${result.count} vendors status updated to ${status} successfully`,
        count: result.count,
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.vendorErrorOptions,
        'Failed to bulk update vendor status',
      );
    }
  }
}

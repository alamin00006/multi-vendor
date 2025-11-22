import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, PayoutStatus } from '@prisma/client';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';
import { CreateVendorPayoutDto } from './dto/create-vendor-payout.dto';
import { UpdateVendorPayoutDto } from './dto/update-vendor-payout.dto';
import {
  QueryVendorPayoutDto,
  PayoutSortBy,
} from './dto/query-vendor-payout.dto';

@Injectable()
export class VendorPayoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  private readonly payoutErrorOptions = {
    entity: 'vendor payout',
    uniqueFieldMap: {},
    foreignKeyMap: {
      vendorId: 'Vendor does not exist',
      requestedBy: 'User does not exist',
    },
    customMessages: {
      P2003: 'Related vendor or user does not exist',
    },
  };

  // Create a new payout request
  async create(userId: string, createPayoutDto: CreateVendorPayoutDto) {
    try {
      const { vendorId, amount, method, reference } = createPayoutDto;

      // Validate vendor exists
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: vendorId },
        // include: { user: true },
      });

      if (!vendor) {
        throw new BadRequestException('Vendor does not exist');
      }

      // Check if user has permission to request payout for this vendor
      // Adjust this logic based on your business rules
      const canRequestPayout = await this.canUserRequestPayout(
        userId,
        vendorId,
      );
      if (!canRequestPayout) {
        throw new ForbiddenException(
          'You do not have permission to request payouts for this vendor',
        );
      }

      // Validate vendor has sufficient balance
      //   if (vendor.balance < amount) {
      //     throw new BadRequestException('Insufficient vendor balance for payout');
      //   }

      // Validate minimum payout amount
      const MIN_PAYOUT_AMOUNT = 10; // Adjust as needed
      if (amount < MIN_PAYOUT_AMOUNT) {
        throw new BadRequestException(
          `Minimum payout amount is $${MIN_PAYOUT_AMOUNT}`,
        );
      }

      const payout = await this.prisma.vendorPayout.create({
        data: {
          vendorId,
          requestedBy: userId,
          amount,
          method,
          reference,
          status: PayoutStatus.PENDING,
        },
        include: {
          vendor: {
            select: {
              id: true,
              //   businessName: true,
              //   balance: true,
            },
          },
          requestedUser: {
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
        message: 'Payout request created successfully',
        payout,
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
        this.payoutErrorOptions,
        'Failed to create payout request',
      );
    }
  }

  // Get all payouts with pagination and filtering
  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.VendorPayoutWhereInput;
    orderBy?: Prisma.VendorPayoutOrderByWithRelationInput;
    include?: Prisma.VendorPayoutInclude;
  }) {
    try {
      const { skip, take, where, orderBy, include } = params || {};

      const defaultInclude: Prisma.VendorPayoutInclude = {
        vendor: {
          select: {
            id: true,
            // businessName: true,
          },
        },
        requestedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      };

      const payouts = await this.prisma.vendorPayout.findMany({
        skip,
        take,
        where,
        include: include || defaultInclude,
        orderBy: orderBy || { createdAt: 'desc' },
      });

      return payouts;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.payoutErrorOptions,
        'Failed to fetch payouts',
      );
    }
  }

  // Get payouts with query parameters
  async findWithQuery(query: QueryVendorPayoutDto) {
    try {
      const {
        page = 1,
        limit = 20,
        vendorId,
        requestedBy,
        status,
        minAmount,
        maxAmount,
        method,
        fromDate,
        toDate,
        sortBy = PayoutSortBy.CREATED_AT,
        sortOrder = 'desc',
      } = query;

      const skip = (page - 1) * limit;
      const where: Prisma.VendorPayoutWhereInput = {};

      if (vendorId) {
        where.vendorId = vendorId;
      }

      if (requestedBy) {
        where.requestedBy = requestedBy;
      }

      if (status) {
        where.status = status;
      }

      if (minAmount !== undefined || maxAmount !== undefined) {
        where.amount = {};
        if (minAmount !== undefined) {
          where.amount.gte = minAmount;
        }
        if (maxAmount !== undefined) {
          where.amount.lte = maxAmount;
        }
      }

      if (method) {
        where.method = { contains: method, mode: 'insensitive' };
      }

      if (fromDate || toDate) {
        where.createdAt = {};
        if (fromDate) {
          where.createdAt.gte = fromDate;
        }
        if (toDate) {
          where.createdAt.lte = toDate;
        }
      }

      // Build orderBy based on sortBy and sortOrder
      let orderBy: Prisma.VendorPayoutOrderByWithRelationInput;
      switch (sortBy) {
        case PayoutSortBy.AMOUNT:
          orderBy = { amount: sortOrder };
          break;
        case PayoutSortBy.PROCESSED_AT:
          orderBy = { processedAt: sortOrder };
          break;
        case PayoutSortBy.UPDATED_AT:
          //   orderBy = { updatedAt: sortOrder };
          break;
        default:
          orderBy = { createdAt: sortOrder };
      }

      const [payouts, total] = await Promise.all([
        this.prisma.vendorPayout.findMany({
          skip,
          take: limit,
          where,
          include: {
            vendor: {
              select: {
                id: true,
                // businessName: true,
                // balance: true,
              },
            },
            requestedUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          //   orderBy,
        }),
        this.prisma.vendorPayout.count({ where }),
      ]);

      return {
        payouts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.payoutErrorOptions,
        'Failed to fetch payouts with query',
      );
    }
  }

  // Get payouts by vendor ID
  async findByVendorId(
    vendorId: string,
    userId?: string,
    isAdmin: boolean = false,
  ) {
    try {
      // Validate vendor exists
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: vendorId },
      });

      if (!vendor) {
        throw new NotFoundException(`Vendor with ID ${vendorId} not found`);
      }

      // Check if user has permission to view these payouts
      //   if (!isAdmin && userId && vendor.userId !== userId) {
      //     throw new ForbiddenException(
      //       'You can only view payouts for your own vendor account',
      //     );
      //   }

      const payouts = await this.prisma.vendorPayout.findMany({
        where: { vendorId },
        include: {
          vendor: {
            select: {
              id: true,
              //   businessName: true,
            },
          },
          requestedUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return payouts;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.payoutErrorOptions,
        `Failed to fetch payouts for vendor ${vendorId}`,
      );
    }
  }

  // Get payouts by user ID (payouts requested by user)
  async findByUserId(userId: string) {
    try {
      const payouts = await this.prisma.vendorPayout.findMany({
        where: { requestedBy: userId },
        include: {
          vendor: {
            select: {
              id: true,
              //   businessName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return payouts;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.payoutErrorOptions,
        `Failed to fetch payouts for user ${userId}`,
      );
    }
  }

  // Get pending payouts (for admin processing)
  async findPending(limit?: number) {
    try {
      const payouts = await this.prisma.vendorPayout.findMany({
        where: {
          status: PayoutStatus.PENDING,
        },
        include: {
          //   vendor: {
          //     select: {
          //       id: true,
          //       businessName: true,
          //       balance: true,
          //       user: {
          //         select: {
          //           id: true,
          //           firstName: true,
          //           lastName: true,
          //           email: true,
          //         },
          //       },
          //     },
          //   },
          requestedUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
      });

      return payouts;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.payoutErrorOptions,
        'Failed to fetch pending payouts',
      );
    }
  }

  // Get a single payout by ID
  async findOne(id: string, userId?: string, isAdmin: boolean = false) {
    try {
      const payout = await this.prisma.vendorPayout.findUnique({
        where: { id },
        include: {
          //   vendor: {
          //     select: {
          //       id: true,
          //       businessName: true,
          //       balance: true,
          //       userId: true,
          //     },
          //   },
          requestedUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!payout) {
        throw new NotFoundException(`Payout with ID ${id} not found`);
      }

      // Check if user has permission to view this payout
      if (!isAdmin && userId) {
        const canView = await this.canUserViewPayout(userId, payout);
        if (!canView) {
          throw new ForbiddenException(
            'You do not have permission to view this payout',
          );
        }
      }

      return payout;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.payoutErrorOptions,
        `Failed to fetch payout with ID ${id}`,
      );
    }
  }

  // Update payout (admin only for status changes)
  async update(
    id: string,
    updatePayoutDto: UpdateVendorPayoutDto,
    isAdmin: boolean = false,
  ) {
    try {
      if (!isAdmin) {
        throw new ForbiddenException('Only administrators can update payouts');
      }

      // Check if payout exists
      const existingPayout = await this.prisma.vendorPayout.findUnique({
        where: { id },
      });

      if (!existingPayout) {
        throw new NotFoundException(`Payout with ID ${id} not found`);
      }

      // If status is being updated to COMPLETED, set processedAt
      const updateData: any = { ...updatePayoutDto };
      if (
        updatePayoutDto.status === PayoutStatus.COMPLETED &&
        !existingPayout.processedAt
      ) {
        updateData.processedAt = new Date();

        // Update vendor balance when payout is completed
        await this.updateVendorBalance(
          existingPayout.vendorId,
          -existingPayout.amount,
        );
      }

      const updatedPayout = await this.prisma.vendorPayout.update({
        where: { id },
        data: updateData,
        include: {
          //   vendor: {
          //     select: {
          //       id: true,
          //       businessName: true,
          //       balance: true,
          //     },
          //   },
          requestedUser: {
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
        message: 'Payout updated successfully',
        payout: updatedPayout,
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
        this.payoutErrorOptions,
        `Failed to update payout with ID ${id}`,
      );
    }
  }

  // Approve payout (admin only)
  async approve(id: string) {
    try {
      const payout = await this.prisma.vendorPayout.findUnique({
        where: { id },
      });

      if (!payout) {
        throw new NotFoundException(`Payout with ID ${id} not found`);
      }

      if (payout.status !== PayoutStatus.PENDING) {
        throw new BadRequestException('Only pending payouts can be approved');
      }

      const updatedPayout = await this.prisma.vendorPayout.update({
        where: { id },
        data: {
          status: PayoutStatus.COMPLETED,
          processedAt: new Date(),
        },
        include: {
          //   vendor: {
          //     select: {
          //       id: true,
          //       businessName: true,
          //     },
          //   },
          requestedUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Update vendor balance
      await this.updateVendorBalance(payout.vendorId, -payout.amount);

      return {
        message: 'Payout approved successfully',
        payout: updatedPayout,
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
        this.payoutErrorOptions,
        `Failed to approve payout with ID ${id}`,
      );
    }
  }

  // Reject payout (admin only)
  async reject(id: string, reason?: string) {
    try {
      const payout = await this.prisma.vendorPayout.findUnique({
        where: { id },
      });

      if (!payout) {
        throw new NotFoundException(`Payout with ID ${id} not found`);
      }

      if (payout.status !== PayoutStatus.PENDING) {
        throw new BadRequestException('Only pending payouts can be rejected');
      }

      const updatedPayout = await this.prisma.vendorPayout.update({
        where: { id },
        data: {
          status: PayoutStatus.REJECTED,
          reference: reason ? `Rejected: ${reason}` : payout.reference,
        },
        include: {
          //   vendor: {
          //     select: {
          //       id: true,
          //       businessName: true,
          //     },
          //   },
        },
      });

      return {
        message: 'Payout rejected successfully',
        payout: updatedPayout,
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
        this.payoutErrorOptions,
        `Failed to reject payout with ID ${id}`,
      );
    }
  }

  // Cancel payout (user who requested it)
  async cancel(id: string, userId: string) {
    try {
      const payout = await this.prisma.vendorPayout.findUnique({
        where: { id },
      });

      if (!payout) {
        throw new NotFoundException(`Payout with ID ${id} not found`);
      }

      if (payout.requestedBy !== userId) {
        throw new ForbiddenException(
          'You can only cancel your own payout requests',
        );
      }

      if (payout.status !== PayoutStatus.PENDING) {
        throw new BadRequestException('Only pending payouts can be cancelled');
      }

      await this.prisma.vendorPayout.delete({
        where: { id },
      });

      return {
        message: 'Payout cancelled successfully',
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
        this.payoutErrorOptions,
        `Failed to cancel payout with ID ${id}`,
      );
    }
  }

  // Delete payout (admin only)
  async remove(id: string) {
    try {
      const payout = await this.prisma.vendorPayout.findUnique({
        where: { id },
      });

      if (!payout) {
        throw new NotFoundException(`Payout with ID ${id} not found`);
      }

      await this.prisma.vendorPayout.delete({
        where: { id },
      });

      return {
        message: 'Payout deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.payoutErrorOptions,
        `Failed to delete payout with ID ${id}`,
      );
    }
  }

  // Get payout statistics
  async getStats(vendorId?: string) {
    try {
      const where: Prisma.VendorPayoutWhereInput = {};
      if (vendorId) {
        where.vendorId = vendorId;
      }

      const [
        totalPayouts,
        pendingPayouts,
        completedPayouts,
        rejectedPayouts,
        totalAmount,
        pendingAmount,
      ] = await Promise.all([
        this.prisma.vendorPayout.count({ where }),
        this.prisma.vendorPayout.count({
          where: { ...where, status: PayoutStatus.PENDING },
        }),
        this.prisma.vendorPayout.count({
          where: { ...where, status: PayoutStatus.COMPLETED },
        }),
        this.prisma.vendorPayout.count({
          where: { ...where, status: PayoutStatus.REJECTED },
        }),
        this.prisma.vendorPayout.aggregate({
          where: { ...where, status: PayoutStatus.COMPLETED },
          _sum: { amount: true },
        }),
        this.prisma.vendorPayout.aggregate({
          where: { ...where, status: PayoutStatus.PENDING },
          _sum: { amount: true },
        }),
      ]);

      const stats = {
        totalPayouts,
        pendingPayouts,
        completedPayouts,
        rejectedPayouts,
        totalAmount: totalAmount._sum.amount || 0,
        pendingAmount: pendingAmount._sum.amount || 0,
        averagePayout:
          completedPayouts > 0
            ? (totalAmount._sum.amount || 0) / completedPayouts
            : 0,
      };

      return stats;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.payoutErrorOptions,
        'Failed to fetch payout statistics',
      );
    }
  }

  // Bulk approve payouts (admin only)
  async bulkApprove(ids: string[]) {
    try {
      const result = await this.prisma.vendorPayout.updateMany({
        where: {
          id: { in: ids },
          status: PayoutStatus.PENDING,
        },
        data: {
          status: PayoutStatus.COMPLETED,
          processedAt: new Date(),
        },
      });

      // Update vendor balances for all affected payouts
      const payouts = await this.prisma.vendorPayout.findMany({
        where: {
          id: { in: ids },
          status: PayoutStatus.COMPLETED,
        },
        select: {
          vendorId: true,
          amount: true,
        },
      });

      // Group by vendor and update balances
      const vendorUpdates = payouts.reduce(
        (acc, payout) => {
          if (!acc[payout.vendorId]) {
            acc[payout.vendorId] = 0;
          }
          acc[payout.vendorId] += payout.amount;
          return acc;
        },
        {} as { [vendorId: string]: number },
      );

      for (const [vendorId, amount] of Object.entries(vendorUpdates)) {
        await this.updateVendorBalance(vendorId, -amount);
      }

      return {
        message: `${result.count} payouts approved successfully`,
        count: result.count,
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.payoutErrorOptions,
        'Failed to bulk approve payouts',
      );
    }
  }

  // Helper method to update vendor balance
  private async updateVendorBalance(vendorId: string, amount: number) {
    try {
      await this.prisma.vendor.update({
        where: { id: vendorId },
        data: {
          //   balance: {
          //     increment: amount,
          //   },
        },
      });
    } catch (error) {
      console.error(`Failed to update vendor balance for ${vendorId}:`, error);
      throw new BadRequestException('Failed to update vendor balance');
    }
  }

  // Helper method to check if user can request payout for vendor
  private async canUserRequestPayout(
    userId: string,
    vendorId: string,
  ): Promise<any> {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: vendorId },
        // select: { userId: true },
      });

      //   return vendor?.userId === userId;
    } catch (error) {
      return false;
    }
  }

  // Helper method to check if user can view payout
  private async canUserViewPayout(
    userId: string,
    payout: any,
  ): Promise<boolean> {
    try {
      // User can view if they requested it or own the vendor
      if (payout.requestedBy === userId) {
        return true;
      }

      const vendor = await this.prisma.vendor.findUnique({
        where: { id: payout.vendorId },
        // select: { userId: true },
      });

      //   return vendor?.userId === userId;
      return true;
    } catch (error) {
      return false;
    }
  }
}

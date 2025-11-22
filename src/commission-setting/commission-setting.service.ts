import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';
import { CreateCommissionSettingDto } from './dtos/create-commission-setting.dto';
import { UpdateCommissionSettingDto } from './dtos/update-commission-setting.dto';
import { QueryCommissionSettingDto } from './dtos/query-commission-setting.dto';

@Injectable()
export class CommissionSettingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  private readonly commissionErrorOptions = {
    entity: 'commission setting',
    uniqueFieldMap: {},
    foreignKeyMap: {},
    customMessages: {
      P2002: 'Commission setting already exists',
    },
  };

  // Create a new commission setting
  async create(createCommissionDto: CreateCommissionSettingDto) {
    try {
      const { commission } = createCommissionDto;

      // Validate commission value
      this.validateCommission(commission);

      // Check if commission setting already exists
      const existingSetting = await this.prisma.commissionSetting.findFirst();
      if (existingSetting) {
        throw new ConflictException(
          'Commission setting already exists. Use update instead.',
        );
      }

      const commissionSetting = await this.prisma.commissionSetting.create({
        data: {
          commission,
        },
      });

      return {
        message: 'Commission setting created successfully',
        commissionSetting,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.commissionErrorOptions,
        'Failed to create commission setting',
      );
    }
  }

  // Get all commission settings with pagination
  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.CommissionSettingWhereInput;
    orderBy?: Prisma.CommissionSettingOrderByWithRelationInput;
  }) {
    try {
      const { skip, take, where, orderBy } = params || {};

      const commissionSettings = await this.prisma.commissionSetting.findMany({
        skip,
        take,
        where,
        orderBy: orderBy || { updatedAt: 'desc' },
      });

      return commissionSettings;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.commissionErrorOptions,
        'Failed to fetch commission settings',
      );
    }
  }

  // Get commission settings with query parameters
  async findWithQuery(query: QueryCommissionSettingDto) {
    try {
      const { page = 1, limit = 20 } = query;

      const skip = (page - 1) * limit;

      const [commissionSettings, total] = await Promise.all([
        this.prisma.commissionSetting.findMany({
          skip,
          take: limit,
          orderBy: { updatedAt: 'desc' },
        }),
        this.prisma.commissionSetting.count(),
      ]);

      return {
        commissionSettings,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.commissionErrorOptions,
        'Failed to fetch commission settings with query',
      );
    }
  }

  // Get current commission setting
  async findCurrent() {
    try {
      const commissionSetting = await this.prisma.commissionSetting.findFirst({
        orderBy: { updatedAt: 'desc' },
      });

      if (!commissionSetting) {
        // Return default setting if none exists
        return {
          id: 'default',
          commission: 0,
          updatedAt: new Date(),
          isDefault: true,
        };
      }

      return commissionSetting;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.commissionErrorOptions,
        'Failed to fetch current commission setting',
      );
    }
  }

  // Get a single commission setting by ID
  async findOne(id: string) {
    try {
      const commissionSetting = await this.prisma.commissionSetting.findUnique({
        where: { id },
      });

      if (!commissionSetting) {
        throw new NotFoundException(
          `Commission setting with ID ${id} not found`,
        );
      }

      return commissionSetting;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.commissionErrorOptions,
        `Failed to fetch commission setting with ID ${id}`,
      );
    }
  }

  // Update commission setting
  async update(id: string, updateCommissionDto: UpdateCommissionSettingDto) {
    try {
      const { commission } = updateCommissionDto;

      // Check if commission setting exists
      const existingSetting = await this.prisma.commissionSetting.findUnique({
        where: { id },
      });

      if (!existingSetting) {
        throw new NotFoundException(
          `Commission setting with ID ${id} not found`,
        );
      }

      // Validate commission value if provided
      if (commission !== undefined) {
        this.validateCommission(commission);
      }

      const updatedCommissionSetting =
        await this.prisma.commissionSetting.update({
          where: { id },
          data: {
            ...(commission !== undefined && { commission }),
          },
        });

      return {
        message: 'Commission setting updated successfully',
        commissionSetting: updatedCommissionSetting,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.commissionErrorOptions,
        `Failed to update commission setting with ID ${id}`,
      );
    }
  }

  // Update or create current commission setting
  async updateCurrent(updateCommissionDto: UpdateCommissionSettingDto) {
    try {
      const { commission } = updateCommissionDto;

      // Validate commission value
      //   this.validateCommission(commission);

      // Get current setting
      const currentSetting = await this.prisma.commissionSetting.findFirst({
        orderBy: { updatedAt: 'desc' },
      });

      let updatedCommissionSetting;

      if (currentSetting) {
        // Update existing setting
        updatedCommissionSetting = await this.prisma.commissionSetting.update({
          where: { id: currentSetting.id },
          data: { commission },
        });
      } else {
        // Create new setting
        updatedCommissionSetting = await this.prisma.commissionSetting.create({
          data: { commission },
        });
      }

      return {
        message: 'Commission setting updated successfully',
        commissionSetting: updatedCommissionSetting,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.commissionErrorOptions,
        'Failed to update current commission setting',
      );
    }
  }

  // Delete commission setting
  async remove(id: string) {
    try {
      const commissionSetting = await this.prisma.commissionSetting.findUnique({
        where: { id },
      });

      if (!commissionSetting) {
        throw new NotFoundException(
          `Commission setting with ID ${id} not found`,
        );
      }

      await this.prisma.commissionSetting.delete({
        where: { id },
      });

      return {
        message: 'Commission setting deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.commissionErrorOptions,
        `Failed to delete commission setting with ID ${id}`,
      );
    }
  }

  // Calculate commission amount for a given order total
  async calculateCommission(orderTotal: number, customCommission?: number) {
    try {
      let commissionPercentage: number;

      if (customCommission !== undefined) {
        this.validateCommission(customCommission);
        commissionPercentage = customCommission;
      } else {
        const currentSetting = await this.findCurrent();
        commissionPercentage = currentSetting.commission;
      }

      const commissionAmount = (orderTotal * commissionPercentage) / 100;
      const vendorAmount = orderTotal - commissionAmount;

      return {
        commissionPercentage,
        commissionAmount: Number(commissionAmount.toFixed(2)),
        vendorAmount: Number(vendorAmount.toFixed(2)),
        orderTotal: Number(orderTotal.toFixed(2)),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.commissionErrorOptions,
        'Failed to calculate commission',
      );
    }
  }

  // Get commission statistics
  async getStats() {
    try {
      const currentSetting = await this.findCurrent();
      const totalSettings = await this.prisma.commissionSetting.count();

      // Get commission history for chart data (last 10 changes)
      const history = await this.prisma.commissionSetting.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          commission: true,
          updatedAt: true,
        },
      });

      const stats = {
        currentCommission: currentSetting.commission,
        totalSettings,
        history: history.reverse(), // Oldest first for charts
        // isDefault: currentSetting.isDefault || false,
      };

      return stats;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.commissionErrorOptions,
        'Failed to fetch commission statistics',
      );
    }
  }

  // Validate commission percentage
  private validateCommission(commission: number): void {
    if (commission < 0 || commission > 100) {
      throw new BadRequestException(
        'Commission must be between 0 and 100 percent',
      );
    }

    // Optional: Add business logic validation
    const MAX_ALLOWED_COMMISSION = 50; // Adjust based on business rules
    if (commission > MAX_ALLOWED_COMMISSION) {
      throw new BadRequestException(
        `Commission cannot exceed ${MAX_ALLOWED_COMMISSION}%`,
      );
    }
  }

  // Get commission history with date range
  async getHistory(fromDate?: Date, toDate?: Date) {
    try {
      const where: Prisma.CommissionSettingWhereInput = {};

      if (fromDate || toDate) {
        where.updatedAt = {};
        if (fromDate) {
          where.updatedAt.gte = fromDate;
        }
        if (toDate) {
          where.updatedAt.lte = toDate;
        }
      }

      const history = await this.prisma.commissionSetting.findMany({
        where,
        orderBy: { updatedAt: 'asc' },
        select: {
          id: true,
          commission: true,
          updatedAt: true,
        },
      });

      return history;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.commissionErrorOptions,
        'Failed to fetch commission history',
      );
    }
  }

  // Bulk create commission settings (for migration or testing)
  async bulkCreate(createCommissionDtos: CreateCommissionSettingDto[]) {
    try {
      // Validate all commissions first
      for (const dto of createCommissionDtos) {
        this.validateCommission(dto.commission);
      }

      const results = await this.prisma.$transaction(
        createCommissionDtos.map((dto) =>
          this.prisma.commissionSetting.create({
            data: dto,
          }),
        ),
      );

      return {
        message: `${results.length} commission settings created successfully`,
        count: results.length,
        commissionSettings: results,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.commissionErrorOptions,
        'Failed to bulk create commission settings',
      );
    }
  }

  // Reset to default commission (0%)
  async resetToDefault() {
    try {
      const currentSetting = await this.prisma.commissionSetting.findFirst({
        orderBy: { updatedAt: 'desc' },
      });

      if (!currentSetting) {
        throw new NotFoundException('No commission setting found to reset');
      }

      const resetSetting = await this.prisma.commissionSetting.create({
        data: {
          commission: 0,
        },
      });

      return {
        message: 'Commission reset to default (0%) successfully',
        commissionSetting: resetSetting,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.commissionErrorOptions,
        'Failed to reset commission to default',
      );
    }
  }
}

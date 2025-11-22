// src/user-address/user-address.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';
import { CreateUserAddressDto } from './dto/create-user-address.dto';
import { UpdateUserAddressDto } from './dto/update-user-address.dto';
import { QueryUserAddressDto } from './dto/query-user-address.dto';

@Injectable()
export class UserAddressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  private readonly userAddressErrorOptions = {
    entity: 'user address',
    uniqueFieldMap: {},
    foreignKeyMap: {
      userId: 'User does not exist',
    },
    customMessages: {
      P2003: 'User does not exist',
    },
  };

  // Create a new user address
  async create(userId: string, createUserAddressDto: CreateUserAddressDto) {
    try {
      const { isDefault, ...addressData } = createUserAddressDto;

      // If setting as default, unset other default addresses for this user
      if (isDefault) {
        await this.prisma.userAddress.updateMany({
          where: {
            userId,
            isDefault: true,
          },
          data: { isDefault: false },
        });
      }

      const userAddress = await this.prisma.userAddress.create({
        data: {
          ...addressData,
          isDefault: isDefault || false,
          userId,
        },
      });

      return {
        message: 'User address created successfully',
        userAddress,
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.userAddressErrorOptions,
        'Failed to create user address',
      );
    }
  }

  // Get all addresses for a user
  async findAllByUser(userId: string, query?: QueryUserAddressDto) {
    try {
      const where: Prisma.UserAddressWhereInput = { userId };

      if (query?.addressType) {
        where.addressType = query.addressType;
      }

      if (query?.city) {
        where.city = { contains: query.city, mode: 'insensitive' };
      }

      if (query?.country) {
        where.country = { contains: query.country, mode: 'insensitive' };
      }

      if (query?.isDefault !== undefined) {
        where.isDefault = query.isDefault;
      }

      const userAddresses = await this.prisma.userAddress.findMany({
        where,
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });

      return userAddresses;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.userAddressErrorOptions,
        'Failed to fetch user addresses',
      );
    }
  }

  // Get all addresses (admin only)
  async findAll(query?: QueryUserAddressDto) {
    try {
      const where: Prisma.UserAddressWhereInput = {};

      if (query?.addressType) {
        where.addressType = query.addressType;
      }

      if (query?.city) {
        where.city = { contains: query.city, mode: 'insensitive' };
      }

      if (query?.country) {
        where.country = { contains: query.country, mode: 'insensitive' };
      }

      if (query?.isDefault !== undefined) {
        where.isDefault = query.isDefault;
      }

      const userAddresses = await this.prisma.userAddress.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return userAddresses;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.userAddressErrorOptions,
        'Failed to fetch user addresses',
      );
    }
  }

  // Get a single address by ID
  async findOne(id: string) {
    try {
      const userAddress = await this.prisma.userAddress.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      if (!userAddress) {
        throw new NotFoundException(`User address with ID ${id} not found`);
      }

      return userAddress;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.userAddressErrorOptions,
        `Failed to fetch user address with ID ${id}`,
      );
    }
  }

  // Get user's default address
  async findDefaultAddress(userId: string) {
    try {
      const defaultAddress = await this.prisma.userAddress.findFirst({
        where: {
          userId,
          isDefault: true,
        },
      });

      return defaultAddress;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.userAddressErrorOptions,
        `Failed to fetch default address for user ${userId}`,
      );
    }
  }

  // Update user address
  async update(id: string, updateUserAddressDto: UpdateUserAddressDto) {
    try {
      // Check if address exists
      const addressExists = await this.prisma.userAddress.findUnique({
        where: { id },
      });

      if (!addressExists) {
        throw new NotFoundException(`User address with ID ${id} not found`);
      }

      const { isDefault, ...updateData } = updateUserAddressDto;

      // If setting as default, unset other default addresses for this user
      if (isDefault) {
        await this.prisma.userAddress.updateMany({
          where: {
            userId: addressExists.userId,
            isDefault: true,
            id: { not: id },
          },
          data: { isDefault: false },
        });
      }

      const updatedAddress = await this.prisma.userAddress.update({
        where: { id },
        data: {
          ...updateData,
          ...(isDefault !== undefined && { isDefault }),
        },
      });

      return {
        message: 'User address updated successfully',
        userAddress: updatedAddress,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.userAddressErrorOptions,
        `Failed to update user address with ID ${id}`,
      );
    }
  }

  // Set address as default
  async setAsDefault(id: string) {
    try {
      const address = await this.prisma.userAddress.findUnique({
        where: { id },
      });

      if (!address) {
        throw new NotFoundException(`User address with ID ${id} not found`);
      }

      // Unset other default addresses for this user
      await this.prisma.userAddress.updateMany({
        where: {
          userId: address.userId,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });

      // Set this address as default
      const updatedAddress = await this.prisma.userAddress.update({
        where: { id },
        data: { isDefault: true },
      });

      return {
        message: 'Address set as default successfully',
        userAddress: updatedAddress,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.userAddressErrorOptions,
        `Failed to set address ${id} as default`,
      );
    }
  }

  // Delete user address
  async remove(id: string) {
    try {
      // Check if address exists
      const address = await this.prisma.userAddress.findUnique({
        where: { id },
      });

      if (!address) {
        throw new NotFoundException(`User address with ID ${id} not found`);
      }

      // Check if it's the default address
      if (address.isDefault) {
        throw new BadRequestException(
          'Cannot delete default address. Please set another address as default first.',
        );
      }

      await this.prisma.userAddress.delete({
        where: { id },
      });

      return {
        message: 'User address deleted successfully',
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
        this.userAddressErrorOptions,
        `Failed to delete user address with ID ${id}`,
      );
    }
  }

  // Get address count by user
  async getAddressCount(userId: string) {
    try {
      const count = await this.prisma.userAddress.count({
        where: { userId },
      });

      return { count };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.userAddressErrorOptions,
        `Failed to get address count for user ${userId}`,
      );
    }
  }

  // Validate address (basic validation)
  async validateAddress(addressData: CreateUserAddressDto) {
    const requiredFields = [
      'addressLine1',
      'city',
      'state',
      'country',
      'postalCode',
    ];
    const missingFields = requiredFields.filter((field) => !addressData[field]);

    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Missing required fields: ${missingFields.join(', ')}`,
      );
    }

    return { valid: true, message: 'Address is valid' };
  }
}

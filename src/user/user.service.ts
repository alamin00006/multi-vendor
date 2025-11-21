// src/user/user.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { QueryUserDto } from './dto/query-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  private readonly userErrorOptions = {
    entity: 'user',
    uniqueFieldMap: {
      email: 'User email already exists',
      phone: 'User phone number already exists',
    },
    foreignKeyMap: {},
    customMessages: {
      P2003: 'Related record not found',
    },
  };

  // Hash password
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  // Verify password
  private async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // Create a new user
  async create(createUserDto: CreateUserDto) {
    try {
      const { password, ...userData } = createUserDto;

      const passwordHash = await this.hashPassword(password);

      const user = await this.prisma.user.create({
        data: {
          ...userData,
          passwordHash,
        },
      });

      // Remove password hash from response
      const { passwordHash: _, ...userResponse } = user;

      return {
        message: 'User created successfully',
        user: userResponse,
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.userErrorOptions,
        'Failed to create user',
      );
    }
  }

  // Get all users with pagination and filtering
  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }) {
    try {
      const { skip, take, where, orderBy } = params || {};

      const users = await this.prisma.user.findMany({
        skip,
        take,
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatarUrl: true,
          dateOfBirth: true,
          gender: true,
          status: true,
          emailVerifiedAt: true,
          phoneVerifiedAt: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              addresses: true,
              orders: true,
              reviews: true,
              wishlists: true,
            },
          },
        },
        orderBy: orderBy || { createdAt: 'desc' },
      });

      return users;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.userErrorOptions,
        'Failed to fetch users',
      );
    }
  }

  // Get users with query parameters
  async findWithQuery(query: QueryUserDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        gender,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = query;

      const skip = (page - 1) * limit;
      const where: Prisma.UserWhereInput = {};

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (status) {
        where.status = status;
      }

      if (gender) {
        where.gender = gender;
      }

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          skip,
          take: limit,
          where,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
            dateOfBirth: true,
            gender: true,
            status: true,
            emailVerifiedAt: true,
            phoneVerifiedAt: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                addresses: true,
                orders: true,
                reviews: true,
                wishlists: true,
              },
            },
          },
          orderBy: { [sortBy]: sortOrder },
        }),
        this.prisma.user.count({ where }),
      ]);

      return {
        users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.userErrorOptions,
        'Failed to fetch users with query',
      );
    }
  }

  // Get a single user by ID
  async findOne(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          addresses: true,
          orders: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
              items: {
                include: {
                  product: {
                    select: {
                      name: true,
                      featuredImageUrl: true,
                    },
                  },
                },
              },
            },
          },
          reviews: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
              product: {
                select: {
                  name: true,
                  featuredImageUrl: true,
                },
              },
            },
          },
          wishlists: {
            take: 10,
            include: {
              product: {
                select: {
                  name: true,
                  featuredImageUrl: true,
                  basePrice: true,
                  salePrice: true,
                },
              },
            },
          },
          _count: {
            select: {
              addresses: true,
              orders: true,
              reviews: true,
              wishlists: true,
              couponUsages: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // Remove password hash from response
      const { passwordHash, ...userResponse } = user;

      return userResponse;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.userErrorOptions,
        `Failed to fetch user with ID ${id}`,
      );
    }
  }

  // Get user by email
  async findByEmail(email: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new NotFoundException(`User with email ${email} not found`);
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.userErrorOptions,
        `Failed to fetch user with email ${email}`,
      );
    }
  }

  // Update user details
  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      // Check if user exists
      const userExists = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!userExists) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: updateUserDto,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatarUrl: true,
          dateOfBirth: true,
          gender: true,
          status: true,
          emailVerifiedAt: true,
          phoneVerifiedAt: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        message: 'User updated successfully',
        user: updatedUser,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.userErrorOptions,
        `Failed to update user with ID ${id}`,
      );
    }
  }

  // Change user password
  async changePassword(id: string, changePasswordDto: ChangePasswordDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // Verify current password
      const isCurrentPasswordValid = await this.verifyPassword(
        changePasswordDto.currentPassword,
        user.passwordHash,
      );

      if (!isCurrentPasswordValid) {
        throw new BadRequestException('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(
        changePasswordDto.newPassword,
      );

      await this.prisma.user.update({
        where: { id },
        data: { passwordHash: newPasswordHash },
      });

      return {
        message: 'Password changed successfully',
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
        this.userErrorOptions,
        `Failed to change password for user with ID ${id}`,
      );
    }
  }

  // Verify user email
  async verifyEmail(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      if (user.emailVerifiedAt) {
        throw new BadRequestException('Email is already verified');
      }

      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: { emailVerifiedAt: new Date() },
        select: {
          id: true,
          email: true,
          emailVerifiedAt: true,
        },
      });

      return {
        message: 'Email verified successfully',
        user: updatedUser,
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
        this.userErrorOptions,
        `Failed to verify email for user with ID ${id}`,
      );
    }
  }

  // Update last login
  async updateLastLogin(id: string) {
    try {
      await this.prisma.user.update({
        where: { id },
        data: { lastLoginAt: new Date() },
      });
    } catch (error) {
      // Don't throw error for last login update to avoid blocking login
      console.error(`Failed to update last login for user ${id}:`, error);
    }
  }

  // Toggle user status
  async toggleStatus(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: { status: newStatus },
        select: {
          id: true,
          email: true,
          status: true,
        },
      });

      return {
        message: `User ${newStatus.toLowerCase()} successfully`,
        user: updatedUser,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.userErrorOptions,
        `Failed to toggle status for user with ID ${id}`,
      );
    }
  }

  // Delete user
  async remove(id: string) {
    try {
      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              orders: true,
              reviews: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // Check if user has orders or reviews
      if (user._count.orders > 0 || user._count.reviews > 0) {
        throw new BadRequestException(
          'Cannot delete user with associated orders or reviews. Please deactivate the user instead.',
        );
      }

      await this.prisma.user.delete({
        where: { id },
      });

      return {
        message: 'User deleted successfully',
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
        this.userErrorOptions,
        `Failed to delete user with ID ${id}`,
      );
    }
  }

  // Get user statistics
  async getStats() {
    try {
      const [
        totalUsers,
        activeUsers,
        verifiedUsers,
        usersByGender,
        usersByStatus,
        newUsersThisMonth,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { status: 'ACTIVE' } }),
        this.prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
        this.prisma.user.groupBy({
          by: ['gender'],
          _count: {
            _all: true,
          },
          where: {
            gender: { not: null },
          },
        }),
        this.prisma.user.groupBy({
          by: ['status'],
          _count: {
            _all: true,
          },
        }),
        this.prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
      ]);

      const stats = {
        totalUsers,
        activeUsers,
        verifiedUsers,
        usersByGender: usersByGender.map((item) => ({
          gender: item.gender,
          count: item._count._all,
        })),
        usersByStatus: usersByStatus.map((item) => ({
          status: item.status,
          count: item._count._all,
        })),
        newUsersThisMonth,
      };

      return stats;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.userErrorOptions,
        'Failed to fetch user statistics',
      );
    }
  }

  // Get user profile (without sensitive relations)
  async getProfile(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatarUrl: true,
          dateOfBirth: true,
          gender: true,
          status: true,
          emailVerifiedAt: true,
          phoneVerifiedAt: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          addresses: {
            where: { isDefault: true },
            take: 1,
          },
          _count: {
            select: {
              orders: true,
              reviews: true,
              wishlists: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.userErrorOptions,
        `Failed to fetch profile for user with ID ${id}`,
      );
    }
  }
}

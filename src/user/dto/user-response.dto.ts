// src/user/dto/user-response.dto.ts
import { Gender, UserStatus, UserRole } from '@prisma/client';
import { Exclude } from 'class-transformer';

export class UserResponseDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt?: Date;
  phoneVerifiedAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  @Exclude()
  passwordHash: string;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}

export class UserWithRelationsResponseDto extends UserResponseDto {
  addresses?: any[];
  orders?: any[];
  reviews?: any[];
  wishlists?: any[];
  vendorsOwned?: any[];
  payoutsRequested?: any[];
  _count?: {
    addresses?: number;
    orders?: number;
    reviews?: number;
    wishlists?: number;
    vendorsOwned?: number;
    payoutsRequested?: number;
  };
}

export class UserWithVendorsResponseDto extends UserResponseDto {
  vendorsOwned?: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    commissionPct: number;
    createdAt: Date;
  }>;
  vendorStats?: {
    totalVendors: number;
    activeVendors: number;
    pendingVendors: number;
    totalProducts: number;
    totalEarnings: number;
  };
}

export class UserListResponseDto {
  success: boolean;
  data: UserResponseDto[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class UserDetailResponseDto {
  success: boolean;
  data: UserWithRelationsResponseDto;
}

export class UserStatsResponseDto {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  usersByRole: { role: UserRole; count: number }[];
  usersByGender: { gender: Gender; count: number }[];
  usersByStatus: { status: UserStatus; count: number }[];
  vendorUsers: number;
  newUsersThisMonth: number;
}

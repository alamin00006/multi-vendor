// src/vendor/dto/vendor-response.dto.ts
import { VendorStatus } from '@prisma/client';

export class VendorResponseDto {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  logoUrl?: string;
  coverPhoto?: string;
  phone?: string;
  email?: string;
  address?: string;
  description?: string;
  status: VendorStatus;
  commissionPct: number;
  createdAt: Date;
  updatedAt: Date;
}

export class VendorWithOwnerResponseDto extends VendorResponseDto {
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
}

export class VendorWithStatsResponseDto extends VendorWithOwnerResponseDto {
  stats?: {
    totalProducts: number;
    publishedProducts: number;
    totalOrders: number;
    pendingOrders: number;
    totalEarnings: number;
    pendingPayouts: number;
  };
}

export class VendorListResponseDto {
  success: boolean;
  data: VendorResponseDto[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class VendorDetailResponseDto {
  success: boolean;
  data: VendorWithStatsResponseDto;
}

export class VendorStatsResponseDto {
  totalVendors: number;
  activeVendors: number;
  pendingVendors: number;
  suspendedVendors: number;
  vendorsByStatus: { status: VendorStatus; count: number }[];
  totalProducts: number;
  totalEarnings: number;
}

export class VendorDashboardResponseDto {
  vendor: VendorResponseDto;
  stats: {
    totalProducts: number;
    publishedProducts: number;
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalEarnings: number;
    pendingPayouts: number;
    thisMonthEarnings: number;
    lastMonthEarnings: number;
  };
  recentOrders: any[];
  lowStockProducts: any[];
}

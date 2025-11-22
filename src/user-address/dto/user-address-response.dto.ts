// src/user-address/dto/user-address-response.dto.ts
import { AddressType } from '@prisma/client';

export class UserAddressResponseDto {
  id: string;
  userId: string;
  addressType: AddressType;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class UserAddressWithUserResponseDto extends UserAddressResponseDto {
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export class UserAddressListResponseDto {
  success: boolean;
  data: UserAddressResponseDto[];
}

export class UserAddressDetailResponseDto {
  success: boolean;
  data: UserAddressResponseDto;
}

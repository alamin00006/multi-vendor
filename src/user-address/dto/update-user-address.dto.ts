// src/user-address/dto/update-user-address.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserAddressDto } from './create-user-address.dto';

export class UpdateUserAddressDto extends PartialType(CreateUserAddressDto) {}

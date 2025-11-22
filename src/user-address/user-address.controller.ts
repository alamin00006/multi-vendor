// src/user-address/user-address.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
  UseInterceptors,
  ClassSerializerInterceptor,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserAddressService } from './user-address.service';
import { CreateUserAddressDto } from './dto/create-user-address.dto';
import { UpdateUserAddressDto } from './dto/update-user-address.dto';
import { QueryUserAddressDto } from './dto/query-user-address.dto';
import {
  UserAddressResponseDto,
  UserAddressWithUserResponseDto,
  UserAddressListResponseDto,
  UserAddressDetailResponseDto,
} from './dto/user-address-response.dto';

import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@ApiTags('user-addresses')
@Controller('user-addresses')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserAddressController {
  constructor(private readonly userAddressService: UserAddressService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new user address' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User address created successfully',
    type: UserAddressDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async create(
    @Req() req: any,
    @Body() createUserAddressDto: CreateUserAddressDto,
  ) {
    const userId = req.user.id;
    const result = await this.userAddressService.create(
      userId,
      createUserAddressDto,
    );
    return {
      success: true,
      message: result.message,
      data: result.userAddress,
    };
  }

  @Get('my-addresses')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all addresses for current user' })
  @ApiQuery({
    name: 'addressType',
    required: false,
    enum: ['HOME', 'OFFICE', 'OTHER'],
  })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'country', required: false, type: String })
  @ApiQuery({ name: 'isDefault', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User addresses retrieved successfully',
    type: UserAddressListResponseDto,
  })
  async findMyAddresses(@Req() req: any, @Query() query: QueryUserAddressDto) {
    const userId = req.user.id;
    const addresses = await this.userAddressService.findAllByUser(
      userId,
      query,
    );
    return {
      success: true,
      data: addresses,
    };
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all user addresses (admin only)' })
  @ApiQuery({
    name: 'addressType',
    required: false,
    enum: ['HOME', 'OFFICE', 'OTHER'],
  })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'country', required: false, type: String })
  @ApiQuery({ name: 'isDefault', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User addresses retrieved successfully',
    type: UserAddressListResponseDto,
  })
  async findAll(@Query() query: QueryUserAddressDto) {
    const addresses = await this.userAddressService.findAll(query);
    return {
      success: true,
      data: addresses,
    };
  }

  @Get('default')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user default address' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Default address retrieved successfully',
    type: UserAddressDetailResponseDto,
  })
  async findDefaultAddress(@Req() req: any) {
    const userId = req.user.id;
    const address = await this.userAddressService.findDefaultAddress(userId);
    return {
      success: true,
      data: address,
    };
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a user address by ID' })
  @ApiParam({ name: 'id', description: 'User address ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User address retrieved successfully',
    type: UserAddressDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User address not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const address = await this.userAddressService.findOne(id);
    return {
      success: true,
      data: address,
    };
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a user address' })
  @ApiParam({ name: 'id', description: 'User address ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User address updated successfully',
    type: UserAddressDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User address not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserAddressDto: UpdateUserAddressDto,
  ) {
    const result = await this.userAddressService.update(
      id,
      updateUserAddressDto,
    );
    return {
      success: true,
      message: result.message,
      data: result.userAddress,
    };
  }

  @Put(':id/set-default')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set address as default' })
  @ApiParam({ name: 'id', description: 'User address ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Address set as default successfully',
    type: UserAddressDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User address not found',
  })
  async setAsDefault(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.userAddressService.setAsDefault(id);
    return {
      success: true,
      message: result.message,
      data: result.userAddress,
    };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user address' })
  @ApiParam({ name: 'id', description: 'User address ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'User address deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User address not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete default address',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.userAddressService.remove(id);
    return {
      success: true,
      message: result.message,
    };
  }

  @Get('user/:userId/count')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get address count for a user (admin only)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Address count retrieved successfully',
  })
  async getAddressCount(@Param('userId', ParseUUIDPipe) userId: string) {
    const result = await this.userAddressService.getAddressCount(userId);
    return {
      success: true,
      data: result,
    };
  }

  @Post('validate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate address data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Address validation result',
  })
  async validateAddress(@Body() addressData: CreateUserAddressDto) {
    const result = await this.userAddressService.validateAddress(addressData);
    return {
      success: true,
      data: result,
    };
  }
}

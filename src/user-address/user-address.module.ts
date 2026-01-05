import { Module } from '@nestjs/common';
import { UserAddressService } from './user-address.service';
import { UserAddressController } from './user-address.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';

@Module({
  controllers: [UserAddressController],
  providers: [UserAddressService, PrismaService, PrismaErrorHandler],
  exports: [UserAddressService],
})
export class UserAddressModule {}

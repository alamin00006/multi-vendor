// src/vendor/vendor.module.ts
import { Module } from '@nestjs/common';
import { VendorService } from './vendor.service';
import { VendorController } from './vendor.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';

@Module({
  controllers: [VendorController],
  providers: [VendorService, PrismaService, PrismaErrorHandler],
  exports: [VendorService],
})
export class VendorModule {}

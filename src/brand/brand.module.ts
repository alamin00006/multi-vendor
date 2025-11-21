// src/brand/brand.module.ts
import { Module } from '@nestjs/common';
import { BrandService } from './brand.service';
import { BrandController } from './brand.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';

@Module({
  controllers: [BrandController],
  providers: [BrandService, PrismaService, PrismaErrorHandler],
  exports: [BrandService],
})
export class BrandModule {}

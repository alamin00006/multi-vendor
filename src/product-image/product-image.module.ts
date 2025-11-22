// src/product-image/product-image.module.ts
import { Module } from '@nestjs/common';
import { ProductImageService } from './product-image.service';
import { ProductImageController } from './product-image.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';

@Module({
  controllers: [ProductImageController],
  providers: [ProductImageService, PrismaService, PrismaErrorHandler],
  exports: [ProductImageService],
})
export class ProductImageModule {}

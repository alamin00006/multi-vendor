import { Module } from '@nestjs/common';
import { ProductVariantService } from './product-variant.service';
import { ProductVariantController } from './product-variant.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';

@Module({
  controllers: [ProductVariantController],
  providers: [ProductVariantService, PrismaService, PrismaErrorHandler],
  exports: [ProductVariantService],
})
export class ProductVariantModule {}

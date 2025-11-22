// src/product-attribute-value/product-attribute-value.module.ts
import { Module } from '@nestjs/common';
import { ProductAttributeValueService } from './product-attribute-value.service';
import { ProductAttributeValueController } from './product-attribute-value.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';

@Module({
  controllers: [ProductAttributeValueController],
  providers: [ProductAttributeValueService, PrismaService, PrismaErrorHandler],
  exports: [ProductAttributeValueService],
})
export class ProductAttributeValueModule {}

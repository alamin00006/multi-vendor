// src/product-attribute/product-attribute.module.ts
import { Module } from '@nestjs/common';
import { ProductAttributeService } from './product-attribute.service';
import { ProductAttributeController } from './product-attribute.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';

@Module({
  controllers: [ProductAttributeController],
  providers: [ProductAttributeService, PrismaService, PrismaErrorHandler],
  exports: [ProductAttributeService],
})
export class ProductAttributeModule {}

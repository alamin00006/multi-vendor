// src/category/category.module.ts
import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';

@Module({
  controllers: [CategoryController],
  providers: [CategoryService, PrismaService, PrismaErrorHandler],
  exports: [CategoryService],
})
export class CategoryModule {}

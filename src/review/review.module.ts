// src/review/review.module.ts
import { Module } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';

@Module({
  controllers: [ReviewController],
  providers: [ReviewService, PrismaService, PrismaErrorHandler],
  exports: [ReviewService],
})
export class ReviewModule {}

import { Module } from '@nestjs/common';
import { VendorPayoutService } from './vendor-payout.service';
import { VendorPayoutController } from './vendor-payout.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';

@Module({
  controllers: [VendorPayoutController],
  providers: [VendorPayoutService, PrismaService, PrismaErrorHandler],
  exports: [VendorPayoutService],
})
export class VendorPayoutModule {}

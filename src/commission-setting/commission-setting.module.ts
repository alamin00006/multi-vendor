import { Module } from '@nestjs/common';
import { CommissionSettingService } from './commission-setting.service';
import { CommissionSettingController } from './commission-setting.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';

@Module({
  controllers: [CommissionSettingController],
  providers: [CommissionSettingService, PrismaService, PrismaErrorHandler],
  exports: [CommissionSettingService],
})
export class CommissionSettingModule {}
